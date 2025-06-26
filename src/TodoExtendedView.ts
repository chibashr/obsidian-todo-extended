import { ItemView, WorkspaceLeaf, TFile, moment } from 'obsidian';
import TodoExtendedPlugin from '../main';
import { TodoItem, TodoGroup, TodoPriority, SortByOption, GroupByOption } from './types';

export const VIEW_TYPE_TODO_EXTENDED = 'todo-extended-view';

export class TodoExtendedView extends ItemView {
	plugin: TodoExtendedPlugin;
	private viewContentEl!: HTMLElement;
	private searchFilters: {
		text: string;
		page: string;
		priority: string;
		dueDateFrom: string;
		dueDateTo: string;
		hasLinks: boolean | null;
		completed: boolean | null;
	} = {
		text: '',
		page: '',
		priority: '',
		dueDateFrom: '',
		dueDateTo: '',
		hasLinks: null,
		completed: null
	};
	private panelsState = {
		search: false,
		grouping: false,
		sorting: false
	};

	constructor(leaf: WorkspaceLeaf, plugin: TodoExtendedPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() {
		return VIEW_TYPE_TODO_EXTENDED;
	}

	getDisplayText() {
		return 'Todo Extended';
	}

	getIcon() {
		return 'checkmark';
	}

	async onOpen() {
		this.viewContentEl = this.containerEl.children[1] as HTMLElement;
		this.viewContentEl.empty();
		this.viewContentEl.addClass('todo-extended-view');
		
		await this.refreshTodos();
	}

	async onClose() {
		// Clean up
	}

	async refreshTodos() {
		if (!this.viewContentEl) return;

		this.viewContentEl.empty();

		// Add header
		const headerEl = this.viewContentEl.createDiv('todo-extended-header');
		headerEl.createEl('h3', { text: 'Todo Extended' });

		// Add control buttons
		const controlsEl = headerEl.createDiv('todo-controls');
		
		// Search/Filter button
		const searchBtn = controlsEl.createEl('button', { 
			text: 'Filter',
			cls: 'todo-control-btn',
			attr: { title: 'Search and Filter' }
		});
		searchBtn.addEventListener('click', () => this.toggleSearchPanel());
		
		// Grouping button
		const groupingBtn = controlsEl.createEl('button', { 
			text: 'Group',
			cls: 'todo-control-btn',
			attr: { title: 'Grouping Settings' }
		});
		groupingBtn.addEventListener('click', () => this.toggleGroupingPanel());
		
		// Sorting button
		const sortingBtn = controlsEl.createEl('button', { 
			text: 'Sort',
			cls: 'todo-control-btn',
			attr: { title: 'Sorting Settings' }
		});
		sortingBtn.addEventListener('click', () => this.toggleSortingPanel());

		// Add refresh button
		const refreshBtn = controlsEl.createEl('button', { 
			text: 'Refresh',
			cls: 'todo-control-btn',
			attr: { title: 'Refresh' }
		});
		refreshBtn.addEventListener('click', () => this.refreshTodos());

		// Add control panels container
		const panelsContainer = this.viewContentEl.createDiv('todo-panels-container');

		// Add loading indicator
		const loadingEl = this.viewContentEl.createDiv('todo-loading');
		loadingEl.setText('Loading todos...');

		try {
			const allGroups = await this.plugin.getAllTodos();
			const filteredGroups = this.applySearchFilters(allGroups);
			loadingEl.remove();

			if (filteredGroups.length === 0) {
				const emptyEl = this.viewContentEl.createDiv('todo-empty');
				emptyEl.setText('No todos found');
				return;
			}

			// Create todos container
			const todosEl = this.viewContentEl.createDiv('todos-container');

			for (const group of filteredGroups) {
				this.renderGroup(todosEl, group);
			}

		} catch (error) {
			loadingEl.setText('Error loading todos');
			console.error('TodoExtended: Error loading todos', error);
		}
	}

	private renderGroup(container: HTMLElement, group: TodoGroup) {
		const groupEl = container.createDiv('todo-group');
		
		// Group header (always show for multi-level grouping)
		if (this.plugin.settings.groupingCriteria.some(c => c.enabled)) {
			const headerEl = groupEl.createDiv('todo-group-header');
			headerEl.createEl('h4', { text: group.name });
			headerEl.createEl('span', { 
				text: `(${group.todos.length})`,
				cls: 'todo-count'
			});
		}

		// Todos list
		const listEl = groupEl.createDiv('todo-list');
		
		for (const todo of group.todos) {
			this.renderTodo(listEl, todo);
		}
	}

	private renderTodo(container: HTMLElement, todo: TodoItem) {
		const todoEl = container.createDiv('todo-item');
		
		if (todo.completed) {
			todoEl.addClass('todo-completed');
		}

		// Add child task classes based on indentation
		if (todo.indent > 0) {
			todoEl.addClass('todo-child');
			if (todo.indent >= 4) {
				todoEl.addClass('todo-child-level-2');
			}
			if (todo.indent >= 8) {
				todoEl.addClass('todo-child-level-3');
			}
		}

		// Checkbox
		const checkboxEl = todoEl.createEl('input', {
			type: 'checkbox',
			cls: 'todo-checkbox'
		});
		checkboxEl.checked = todo.completed;
		checkboxEl.addEventListener('change', async () => {
			await this.plugin.toggleTodo(todo.id);
		});

		// Todo content
		const contentEl = todoEl.createDiv('todo-content');
		
		// Todo text (use display text without wiki links)
		const textEl = contentEl.createDiv('todo-text');
		textEl.setText(todo.displayText);
		textEl.addEventListener('click', () => this.openTodoFile(todo));

		// Add linked note icons outside content flow
		if (todo.linkedNotes.length > 0) {
			const linkedNotesEl = todoEl.createDiv('todo-linked-notes');
			for (const noteName of todo.linkedNotes) {
				const linkBtn = linkedNotesEl.createEl('button', {
					cls: 'todo-link-icon'
				});
				linkBtn.innerHTML = '🔗';
				linkBtn.title = `Open ${noteName}`; // Show note name on hover
				linkBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					this.openLinkedNote(noteName);
				});
			}
		}

		// Add images if setting is enabled
		if (this.plugin.settings.showImages && todo.images.length > 0) {
			const imagesEl = contentEl.createDiv('todo-images');
			
			if (this.plugin.settings.autoCollapseImages) {
				imagesEl.addClass('todo-images-collapsed');
				
				const toggleBtn = imagesEl.createEl('button', {
					text: `📷 ${todo.images.length} image${todo.images.length > 1 ? 's' : ''}`,
					cls: 'todo-images-toggle'
				});
				
				const imageContainer = imagesEl.createDiv('todo-images-container');
				
				toggleBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					imageContainer.toggleClass('todo-images-expanded', !imageContainer.hasClass('todo-images-expanded'));
					toggleBtn.setText(imageContainer.hasClass('todo-images-expanded') ? 
						'📷 Hide images' : `📷 ${todo.images.length} image${todo.images.length > 1 ? 's' : ''}`);
				});
				
				for (const imagePath of todo.images) {
					const imgEl = imageContainer.createEl('img', {
						cls: 'todo-image'
					});
					imgEl.src = imagePath;
				}
			} else {
				for (const imagePath of todo.images) {
					const imgEl = imagesEl.createEl('img', {
						cls: 'todo-image'
					});
					imgEl.src = imagePath;
				}
			}
		}

		// Todo metadata
		const metaEl = contentEl.createDiv('todo-meta');
		
		// File name
		const fileEl = metaEl.createSpan('todo-file');
		fileEl.setText(todo.file.basename);
		fileEl.addEventListener('click', () => this.openTodoFile(todo));

		// Priority display - show colored tag when priority is set, selector when none
		if (this.plugin.settings.enableInlineEditing) {
			if (todo.priority !== 'none') {
				// Show colored priority tag that can be clicked to change
				const priorityEl = metaEl.createSpan('todo-priority clickable-priority');
				priorityEl.addClass(`todo-priority-${todo.priority}`);
				priorityEl.setText(todo.priority.toUpperCase());
				priorityEl.title = 'Click to change priority';
				
				priorityEl.addEventListener('click', (e) => {
					e.stopPropagation();
					this.showPrioritySelector(priorityEl, todo);
				});
			} else {
				// Show priority selector when no priority is set
				const prioritySelector = metaEl.createEl('select', { cls: 'todo-priority-selector' });
				const priorities: { value: TodoPriority; label: string }[] = [
					{ value: 'none', label: 'No Priority' },
					{ value: 'low', label: 'Low' },
					{ value: 'medium', label: 'Medium' },
					{ value: 'high', label: 'High' }
				];
				
				priorities.forEach(p => {
					const option = prioritySelector.createEl('option', { value: p.value, text: p.label });
					if (p.value === todo.priority) option.selected = true;
				});
				
				prioritySelector.addEventListener('change', async () => {
					const newPriority = prioritySelector.value as TodoPriority;
					await this.plugin.updateTodoPriority(todo.id, newPriority);
				});
			}
		} else {
			// If inline editing is disabled, just show the priority tag
			if (todo.priority !== 'none') {
				const priorityEl = metaEl.createSpan('todo-priority');
				priorityEl.addClass(`todo-priority-${todo.priority}`);
				priorityEl.setText(todo.priority.toUpperCase());
			}
		}

		// Due date with calendar popup
		const dueDateEl = metaEl.createSpan('todo-due-date clickable-date');
		if (todo.dueDate) {
			const isOverdue = todo.dueDate.isBefore(window.moment(), 'day');
			const isToday = todo.dueDate.isSame(window.moment(), 'day');
			
			if (isOverdue) {
				dueDateEl.addClass('todo-overdue');
			} else if (isToday) {
				dueDateEl.addClass('todo-today');
			}
			
			dueDateEl.setText(todo.dueDate.format(this.plugin.settings.dateDisplayFormat));
		} else {
			dueDateEl.setText('Set due date');
			dueDateEl.addClass('todo-no-date');
		}

		// Add calendar popup functionality
		if (this.plugin.settings.enableInlineEditing) {
			dueDateEl.addEventListener('click', (e) => {
				e.stopPropagation();
				this.showDatePicker(dueDateEl, todo);
			});
		}

		// Tags
		if (todo.tags.length > 0) {
			const tagsEl = metaEl.createDiv('todo-tags');
			for (const tag of todo.tags) {
				const tagEl = tagsEl.createSpan('todo-tag');
				tagEl.setText(`#${tag}`);
			}
		}
	}

	private renderSortingControlsInternal(container: HTMLElement, isModal: boolean = false) {
		const sortingEl = container.createDiv('todo-sorting-controls');
		
		// Primary sort dropdown
		const primarySortContainer = sortingEl.createDiv('sort-container');
		primarySortContainer.createEl('label', { text: 'Sort by: ', cls: 'sort-label' });
		
		const primarySortSelect = primarySortContainer.createEl('select', { cls: 'sort-select' });
		const sortOptions: { value: SortByOption; label: string }[] = [
			{ value: 'priority', label: 'Priority' },
			{ value: 'dueDate', label: 'Due Date' },
			{ value: 'fileName', label: 'File Name' },
			{ value: 'folderName', label: 'Folder' },
			{ value: 'text', label: 'Task Text' },
			{ value: 'line', label: 'Order in File' }
		];
		
		sortOptions.forEach(option => {
			const optionEl = primarySortSelect.createEl('option', { 
				value: option.value, 
				text: option.label 
			});
			if (option.value === this.plugin.settings.sortingCriteria[0]?.type) {
				optionEl.selected = true;
			}
		});
		
		// Direction toggle for primary sort
		const directionBtn = primarySortContainer.createEl('button', {
			text: this.plugin.settings.sortingCriteria[0]?.direction === 'desc' ? '↓' : '↑',
			cls: 'sort-direction-btn'
		});
		directionBtn.title = this.plugin.settings.sortingCriteria[0]?.direction === 'desc' ? 'Descending' : 'Ascending';
		
		// Event listeners
		primarySortSelect.addEventListener('change', async () => {
			const newType = primarySortSelect.value as SortByOption;
			this.plugin.settings.sortingCriteria[0] = {
				...this.plugin.settings.sortingCriteria[0],
				type: newType
			};
			await this.plugin.saveSettings();
		});
		
		directionBtn.addEventListener('click', async () => {
			const currentDirection = this.plugin.settings.sortingCriteria[0]?.direction || 'asc';
			const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
			
			this.plugin.settings.sortingCriteria[0] = {
				...this.plugin.settings.sortingCriteria[0],
				direction: newDirection
			};
			
			directionBtn.textContent = newDirection === 'desc' ? '↓' : '↑';
			directionBtn.title = newDirection === 'desc' ? 'Descending' : 'Ascending';
			
			await this.plugin.saveSettings();
		});
	}

	private renderGroupingControlsInModal(container: HTMLElement) {
		this.renderGroupingControlsInternal(container, true);
	}

	private renderSortingControlsInModal(container: HTMLElement) {
		this.renderSortingControlsInternal(container, true);
	}

	private renderGroupingControlsInternal(container: HTMLElement, isModal: boolean = false) {
		const groupingEl = container.createDiv('todo-grouping-controls');
		
		// Header with add button
		const headerEl = groupingEl.createDiv('grouping-header');
		headerEl.createEl('span', { text: 'Grouping:', cls: 'grouping-header-label' });
		
		const addButton = headerEl.createEl('button', {
			text: '+ Add',
			cls: 'add-grouping-btn'
		});
		
		addButton.addEventListener('click', async () => {
			const newCriterion = {
				id: `criterion-${Date.now()}`,
				type: 'page' as GroupByOption,
				enabled: true,
				order: this.plugin.settings.groupingCriteria.length
			};
			
			this.plugin.settings.groupingCriteria.push(newCriterion);
			await this.plugin.saveSettings();
			if (isModal) {
				container.empty();
				this.renderGroupingControlsInternal(container, true);
			} else {
				this.renderPanels();
			}
		});
		
		// Render existing criteria
		const criteriaContainer = groupingEl.createDiv('grouping-criteria-list');
		
		const enabledCriteria = this.plugin.settings.groupingCriteria
			.filter(c => c.enabled)
			.sort((a, b) => a.order - b.order);
		
		if (enabledCriteria.length === 0) {
			const emptyEl = criteriaContainer.createDiv('grouping-empty');
			emptyEl.setText('No grouping criteria. Click "Add" to create one.');
		} else {
					for (const criterion of enabledCriteria) {
			this.renderGroupingCriterion(criteriaContainer, criterion, container, isModal);
		}
		}
	}

	private renderGroupingCriterion(container: HTMLElement, criterion: any, parentContainer: HTMLElement, isModal: boolean) {
		const criterionEl = container.createDiv('grouping-criterion-panel');
		
		// Type dropdown
		const typeSelect = criterionEl.createEl('select', { cls: 'criterion-type' });
		const typeOptions = [
			{ value: 'page', label: 'Page' },
			{ value: 'folder', label: 'Folder' },
			{ value: 'tag', label: 'Tag' },
			{ value: 'property', label: 'Property' },
			{ value: 'dueDate', label: 'Due Date' },
			{ value: 'priority', label: 'Priority' }
		];
		
		typeOptions.forEach(option => {
			const optionEl = typeSelect.createEl('option', {
				value: option.value,
				text: option.label
			});
			if (option.value === criterion.type) {
				optionEl.selected = true;
			}
		});
		
		typeSelect.addEventListener('change', async () => {
			criterion.type = typeSelect.value as GroupByOption;
			if (criterion.type !== 'property') {
				criterion.property = undefined;
			}
			await this.plugin.saveSettings();
			if (isModal) {
				parentContainer.empty();
				this.renderGroupingControlsInternal(parentContainer, true);
			} else {
				this.renderPanels();
			}
		});

		// Property selector (only for property type)
		if (criterion.type === 'property') {
			const propertySelect = criterionEl.createEl('select', { cls: 'criterion-property' });
			
			// Add empty option
			propertySelect.createEl('option', { value: '', text: 'Select property...' });
			
			// Add available properties
			for (const prop of this.plugin.settings.availableProperties) {
				const propOption = propertySelect.createEl('option', {
					value: prop,
					text: prop
				});
				if (prop === criterion.property) {
					propOption.selected = true;
				}
			}
			
			propertySelect.addEventListener('change', async () => {
				criterion.property = propertySelect.value || undefined;
				await this.plugin.saveSettings();
			});
		}

		// Remove button
		const removeBtn = criterionEl.createEl('button', {
			text: '×',
			cls: 'remove-grouping-btn'
		});
		
		removeBtn.addEventListener('click', async () => {
			const index = this.plugin.settings.groupingCriteria.findIndex(c => c.id === criterion.id);
			if (index !== -1) {
				this.plugin.settings.groupingCriteria.splice(index, 1);
				// Reorder remaining criteria
				this.plugin.settings.groupingCriteria.forEach((c, i) => c.order = i);
				await this.plugin.saveSettings();
				if (isModal) {
					parentContainer.empty();
					this.renderGroupingControlsInternal(parentContainer, true);
				} else {
					this.renderPanels();
				}
			}
		});
	}

	private toggleSearchPanel() {
		this.panelsState.search = !this.panelsState.search;
		this.panelsState.grouping = false;
		this.panelsState.sorting = false;
		this.renderPanels();
	}

	private toggleGroupingPanel() {
		this.panelsState.grouping = !this.panelsState.grouping;
		this.panelsState.search = false;
		this.panelsState.sorting = false;
		this.renderPanels();
	}

	private toggleSortingPanel() {
		this.panelsState.sorting = !this.panelsState.sorting;
		this.panelsState.search = false;
		this.panelsState.grouping = false;
		this.renderPanels();
	}

	private renderPanels() {
		const panelsContainer = this.viewContentEl.querySelector('.todo-panels-container') as HTMLElement;
		if (!panelsContainer) return;
		
		panelsContainer.empty();
		
		if (this.panelsState.search) {
			this.renderSearchPanel(panelsContainer);
		} else if (this.panelsState.grouping) {
			this.renderGroupingPanel(panelsContainer);
		} else if (this.panelsState.sorting) {
			this.renderSortingPanel(panelsContainer);
		}
	}

	private renderSearchPanel(container: HTMLElement) {
		const panel = container.createDiv('todo-panel search-panel');
		
		// Panel header
		const header = panel.createDiv('todo-panel-header');
		header.createEl('h4', { text: 'Search and Filter' });
		
		// Search form
		const form = panel.createDiv('todo-search-form');
		
		// Create a grid layout for compact form
		const formGrid = form.createDiv('search-form-grid');
		
		// Text search
		const textGroup = formGrid.createDiv('search-group');
		textGroup.createEl('label', { text: 'Text:' });
		const textInput = textGroup.createEl('input', { 
			type: 'text', 
			placeholder: 'Search tasks...',
			value: this.searchFilters.text
		});
		
		// Page filter
		const pageGroup = formGrid.createDiv('search-group');
		pageGroup.createEl('label', { text: 'Page:' });
		const pageInput = pageGroup.createEl('input', { 
			type: 'text', 
			placeholder: 'Filter pages...',
			value: this.searchFilters.page
		});
		
		// Priority filter
		const priorityGroup = formGrid.createDiv('search-group');
		priorityGroup.createEl('label', { text: 'Priority:' });
		const prioritySelect = priorityGroup.createEl('select');
		const priorityOptions = [
			{ value: '', label: 'Any' },
			{ value: 'high', label: 'High' },
			{ value: 'medium', label: 'Medium' },
			{ value: 'low', label: 'Low' },
			{ value: 'none', label: 'None' }
		];
		priorityOptions.forEach(option => {
			const optionEl = prioritySelect.createEl('option', { value: option.value, text: option.label });
			if (option.value === this.searchFilters.priority) optionEl.selected = true;
		});
		
		// Due date from
		const fromGroup = formGrid.createDiv('search-group');
		fromGroup.createEl('label', { text: 'Due from:' });
		const fromInput = fromGroup.createEl('input', { 
			type: 'date',
			value: this.searchFilters.dueDateFrom
		});
		
		// Due date to
		const toGroup = formGrid.createDiv('search-group');
		toGroup.createEl('label', { text: 'Due to:' });
		const toInput = toGroup.createEl('input', { 
			type: 'date',
			value: this.searchFilters.dueDateTo
		});
		
		// Checkboxes in a row
		const checkboxRow = form.createDiv('checkbox-row');
		
		const linksLabel = checkboxRow.createEl('label', { cls: 'checkbox-label' });
		const linksCheckbox = linksLabel.createEl('input', { type: 'checkbox' });
		linksLabel.createSpan({ text: 'Has links' });
		if (this.searchFilters.hasLinks === true) linksCheckbox.checked = true;
		
		const completedLabel = checkboxRow.createEl('label', { cls: 'checkbox-label' });
		const completedCheckbox = completedLabel.createEl('input', { type: 'checkbox' });
		completedLabel.createSpan({ text: 'Completed only' });
		if (this.searchFilters.completed === true) completedCheckbox.checked = true;
		
		// Buttons
		const buttonGroup = form.createDiv('search-buttons');
		
		const applyBtn = buttonGroup.createEl('button', { text: 'Apply', cls: 'todo-btn-primary' });
		applyBtn.addEventListener('click', () => {
			this.searchFilters.text = textInput.value;
			this.searchFilters.page = pageInput.value;
			this.searchFilters.priority = prioritySelect.value;
			this.searchFilters.dueDateFrom = fromInput.value;
			this.searchFilters.dueDateTo = toInput.value;
			this.searchFilters.hasLinks = linksCheckbox.checked ? true : null;
			this.searchFilters.completed = completedCheckbox.checked ? true : null;
			
			this.refreshTodos();
		});
		
		const clearBtn = buttonGroup.createEl('button', { text: 'Clear', cls: 'todo-btn-secondary' });
		clearBtn.addEventListener('click', () => {
			this.searchFilters = {
				text: '',
				page: '',
				priority: '',
				dueDateFrom: '',
				dueDateTo: '',
				hasLinks: null,
				completed: null
			};
			this.refreshTodos();
		});
	}

	private renderGroupingPanel(container: HTMLElement) {
		const panel = container.createDiv('todo-panel grouping-panel');
		
		// Panel header
		const header = panel.createDiv('todo-panel-header');
		header.createEl('h4', { text: 'Grouping Settings' });
		
		// Grouping controls
		this.renderGroupingControlsInternal(panel, false);
	}

	private renderSortingPanel(container: HTMLElement) {
		const panel = container.createDiv('todo-panel sorting-panel');
		
		// Panel header
		const header = panel.createDiv('todo-panel-header');
		header.createEl('h4', { text: 'Sorting Settings' });
		
		// Sorting controls
		this.renderSortingControlsInternal(panel, false);
	}

	private applySearchFilters(groups: TodoGroup[]): TodoGroup[] {
		return groups.map(group => {
			const filteredTodos = group.todos.filter(todo => {
				// Text filter
				if (this.searchFilters.text && !todo.displayText.toLowerCase().includes(this.searchFilters.text.toLowerCase())) {
					return false;
				}
				
				// Page filter
				if (this.searchFilters.page && !todo.file.basename.toLowerCase().includes(this.searchFilters.page.toLowerCase())) {
					return false;
				}
				
				// Priority filter
				if (this.searchFilters.priority && todo.priority !== this.searchFilters.priority) {
					return false;
				}
				
				// Due date range filter
				if (this.searchFilters.dueDateFrom || this.searchFilters.dueDateTo) {
					if (!todo.dueDate) return false;
					
					if (this.searchFilters.dueDateFrom) {
						const fromDate = moment(this.searchFilters.dueDateFrom);
						if (todo.dueDate.isBefore(fromDate, 'day')) return false;
					}
					
					if (this.searchFilters.dueDateTo) {
						const toDate = moment(this.searchFilters.dueDateTo);
						if (todo.dueDate.isAfter(toDate, 'day')) return false;
					}
				}
				
				// Has links filter
				if (this.searchFilters.hasLinks === true && todo.linkedNotes.length === 0) {
					return false;
				}
				
				// Completed filter
				if (this.searchFilters.completed === true && !todo.completed) {
					return false;
				}
				
				return true;
			});
			
			return {
				...group,
				todos: filteredTodos
			};
		}).filter(group => group.todos.length > 0);
	}

	private showPrioritySelector(priorityEl: HTMLElement, todo: TodoItem) {
		// Create temporary dropdown
		const selector = priorityEl.parentElement!.createEl('select', { cls: 'todo-priority-selector-temp' });
		const priorities: { value: TodoPriority; label: string }[] = [
			{ value: 'none', label: 'No Priority' },
			{ value: 'low', label: 'Low' },
			{ value: 'medium', label: 'Medium' },
			{ value: 'high', label: 'High' }
		];
		
		priorities.forEach(p => {
			const option = selector.createEl('option', { value: p.value, text: p.label });
			if (p.value === todo.priority) option.selected = true;
		});
		
		// Position next to the priority element
		priorityEl.style.display = 'none';
		
		// Focus and handle selection
		selector.focus();
		
		const handleSelection = async () => {
			const newPriority = selector.value as TodoPriority;
			await this.plugin.updateTodoPriority(todo.id, newPriority);
			selector.remove();
			priorityEl.style.display = '';
		};
		
		const cleanup = () => {
			selector.remove();
			priorityEl.style.display = '';
		};
		
		selector.addEventListener('change', handleSelection);
		selector.addEventListener('blur', cleanup);
		
		// Handle escape key
		selector.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') {
				cleanup();
			}
		});
	}

	private async openTodoFile(todo: TodoItem) {
		const { workspace } = this.app;
		
		if (this.plugin.settings.openInNewLeaf) {
			const leaf = workspace.getLeaf('tab');
			await leaf.openFile(todo.file);
		} else {
			await workspace.getLeaf().openFile(todo.file);
		}

		// Try to scroll to the specific line
		setTimeout(() => {
			const activeView = workspace.getActiveViewOfType(ItemView);
			if (activeView && 'editor' in activeView) {
				const editor = (activeView as any).editor;
				if (editor && editor.setCursor) {
					editor.setCursor(todo.line, 0);
					editor.scrollIntoView({ from: { line: todo.line, ch: 0 }, to: { line: todo.line, ch: 0 } }, true);
				}
			}
		}, 100);
	}

	private async openLinkedNote(noteName: string) {
		const { workspace, vault } = this.app;
		
		// Find the file with this name
		const file = vault.getAbstractFileByPath(`${noteName}.md`) || 
					vault.getFiles().find(f => f.basename === noteName);
		
		if (file instanceof TFile) {
			if (this.plugin.settings.openInNewLeaf) {
				const leaf = workspace.getLeaf('tab');
				await leaf.openFile(file);
			} else {
				await workspace.getLeaf().openFile(file);
			}
		} else {
			// Create the note if it doesn't exist
			const newFile = await vault.create(`${noteName}.md`, '');
			if (this.plugin.settings.openInNewLeaf) {
				const leaf = workspace.getLeaf('tab');
				await leaf.openFile(newFile);
			} else {
				await workspace.getLeaf().openFile(newFile);
			}
		}
	}

	private showDatePicker(dueDateEl: HTMLElement, todo: TodoItem) {
		// Remove any existing date picker
		const existingPicker = document.querySelector('.todo-date-picker');
		if (existingPicker) {
			existingPicker.remove();
		}

		// Create a date picker popup
		const picker = document.createElement('div');
		picker.className = 'todo-date-picker';
		
		// Create the date input
		const dateInput = picker.createEl('input', {
			type: 'text',
			cls: 'date-picker-input',
			placeholder: this.plugin.settings.dateInputFormat
		});
		
		if (todo.dueDate) {
			dateInput.value = todo.dueDate.format(this.plugin.settings.dateInputFormat);
		}

		// Add control buttons
		const buttonsDiv = picker.createDiv('date-picker-buttons');
		
		const saveBtn = buttonsDiv.createEl('button', {
			text: 'Save',
			cls: 'date-picker-save'
		});
		
		const clearBtn = buttonsDiv.createEl('button', {
			text: 'Clear',
			cls: 'date-picker-clear'
		});
		
		const cancelBtn = buttonsDiv.createEl('button', {
			text: 'Cancel',
			cls: 'date-picker-cancel'
		});

		// Position the picker near the due date element
		const rect = dueDateEl.getBoundingClientRect();
		picker.style.position = 'absolute';
		picker.style.top = `${rect.bottom + 5}px`;
		picker.style.left = `${rect.left}px`;
		picker.style.zIndex = '1000';

		// Add to document
		document.body.appendChild(picker);

		// Focus the input
		dateInput.focus();

		// Event handlers
		saveBtn.addEventListener('click', async () => {
			const newDate = dateInput.value ? moment(dateInput.value, this.plugin.settings.dateInputFormat, true) : null;
			if (dateInput.value && !newDate?.isValid()) {
				// Show error message
				const errorMsg = picker.createDiv('date-picker-error');
				errorMsg.setText(`Invalid date format. Please use ${this.plugin.settings.dateInputFormat}`);
				setTimeout(() => errorMsg.remove(), 3000);
				return;
			}
			await this.plugin.updateTodoDueDate(todo.id, newDate);
			picker.remove();
		});

		clearBtn.addEventListener('click', async () => {
			await this.plugin.updateTodoDueDate(todo.id, null);
			picker.remove();
		});

		cancelBtn.addEventListener('click', () => {
			picker.remove();
		});

		// Close on outside click
		setTimeout(() => {
			const closeOnOutsideClick = (e: MouseEvent) => {
				if (!picker.contains(e.target as Node)) {
					picker.remove();
					document.removeEventListener('click', closeOnOutsideClick);
				}
			};
			document.addEventListener('click', closeOnOutsideClick);
		}, 100);

		// Close on escape key
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				picker.remove();
				document.removeEventListener('keydown', handleEscape);
			}
		};
		document.addEventListener('keydown', handleEscape);
	}
} 