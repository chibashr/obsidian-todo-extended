import { ItemView, WorkspaceLeaf, TFile, moment } from 'obsidian';
import TodoExtendedPlugin from '../main';
import { TodoItem, TodoGroup, TodoPriority } from './types';

export const VIEW_TYPE_TODO_EXTENDED = 'todo-extended-view';

export class TodoExtendedView extends ItemView {
	plugin: TodoExtendedPlugin;
	private viewContentEl!: HTMLElement;

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

		// Add refresh button
		const refreshBtn = headerEl.createEl('button', { 
			text: '↻',
			cls: 'todo-refresh-btn'
		});
		refreshBtn.addEventListener('click', () => this.refreshTodos());

		// Add loading indicator
		const loadingEl = this.viewContentEl.createDiv('todo-loading');
		loadingEl.setText('Loading todos...');

		try {
			const groups = await this.plugin.getAllTodos();
			loadingEl.remove();

			if (groups.length === 0) {
				const emptyEl = this.viewContentEl.createDiv('todo-empty');
				emptyEl.setText('No todos found');
				return;
			}

			// Create todos container
			const todosEl = this.viewContentEl.createDiv('todos-container');

			for (const group of groups) {
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

		// Priority
		if (todo.priority !== 'none') {
			const priorityEl = metaEl.createSpan('todo-priority');
			priorityEl.addClass(`todo-priority-${todo.priority}`);
			priorityEl.setText(`${todo.priority.toUpperCase()}`);
		}

		// Add priority selector if inline editing is enabled
		if (this.plugin.settings.enableInlineEditing) {
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