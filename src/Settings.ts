import { App, PluginSettingTab, Setting } from 'obsidian';
import TodoExtendedPlugin from '../main';
import { GroupByOption, GroupingCriterion, SortingCriterion } from './types';

export interface TodoExtendedSettings {
	filterMostRecentDaily: boolean;
	dueDateFormat: string;
	dateDisplayFormat: string;
	dateInputFormat: string;
	priorityFormat: string;
	groupingCriteria: GroupingCriterion[];
	sortingCriteria: SortingCriterion[];
	hideCompletedTodos: boolean;
	hideBlankTodos: boolean;
	openInNewLeaf: boolean;
	enableInlineEditing: boolean;
	showImages: boolean;
	autoCollapseImages: boolean;
	availableProperties: string[];
}

export const DEFAULT_SETTINGS: TodoExtendedSettings = {
	filterMostRecentDaily: false,
	dueDateFormat: 'due:%date%',
	dateDisplayFormat: 'MMM DD',
	dateInputFormat: 'YYYY-MM-DD',
	priorityFormat: '!%priority%',
	groupingCriteria: [
		{ id: 'primary', type: 'page', enabled: true, order: 0 }
	],
	sortingCriteria: [
		{ type: 'priority', direction: 'asc' },
		{ type: 'dueDate', direction: 'asc' },
		{ type: 'line', direction: 'asc' }
	],
	hideCompletedTodos: false,
	hideBlankTodos: true,
	openInNewLeaf: false,
	enableInlineEditing: true,
	showImages: true,
	autoCollapseImages: false,
	availableProperties: []
};

export class TodoExtendedSettingTab extends PluginSettingTab {
	plugin: TodoExtendedPlugin;

	constructor(app: App, plugin: TodoExtendedPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Todo Extended Settings' });

		// Filter most recent daily note
		new Setting(containerEl)
			.setName('Filter most recent daily note only')
			.setDesc('When enabled, only shows todos from the most recent daily note to avoid duplicates from rolled-over tasks')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.filterMostRecentDaily)
				.onChange(async (value) => {
					this.plugin.settings.filterMostRecentDaily = value;
					await this.plugin.saveSettings();
				}));

		// Due date format
		new Setting(containerEl)
			.setName('Due date format')
			.setDesc('Format for due dates in tasks. Use %date% as placeholder for the date')
			.addText(text => text
				.setPlaceholder('due:%date%')
				.setValue(this.plugin.settings.dueDateFormat)
				.onChange(async (value) => {
					this.plugin.settings.dueDateFormat = value;
					await this.plugin.saveSettings();
				}));

		// Date input format
		new Setting(containerEl)
			.setName('Date input format')
			.setDesc('Format for entering dates in tasks. Uses moment.js format (e.g., YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY)')
			.addText(text => text
				.setPlaceholder('YYYY-MM-DD')
				.setValue(this.plugin.settings.dateInputFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateInputFormat = value;
					await this.plugin.saveSettings();
				}));

		// Date display format
		new Setting(containerEl)
			.setName('Date display format')
			.setDesc('How due dates appear in the todo list. Uses moment.js format (e.g., MMM DD, YYYY-MM-DD, DD/MM)')
			.addText(text => text
				.setPlaceholder('MMM DD')
				.setValue(this.plugin.settings.dateDisplayFormat)
				.onChange(async (value) => {
					this.plugin.settings.dateDisplayFormat = value;
					await this.plugin.saveSettings();
				}));

		// Priority format
		new Setting(containerEl)
			.setName('Priority format')
			.setDesc('Format for priority indicators. Use %priority% as placeholder (high, medium, low)')
			.addText(text => text
				.setPlaceholder('!%priority%')
				.setValue(this.plugin.settings.priorityFormat)
				.onChange(async (value) => {
					this.plugin.settings.priorityFormat = value;
					await this.plugin.saveSettings();
				}));



		// Advanced grouping section
		containerEl.createEl('h3', { text: 'Advanced Multi-Level Grouping' });
		
		const groupingDesc = containerEl.createEl('p');
		groupingDesc.setText('Create multiple levels of grouping. Drag to reorder, toggle to enable/disable.');
		
		this.renderGroupingCriteria(containerEl);

		// Hide completed todos
		new Setting(containerEl)
			.setName('Hide completed todos')
			.setDesc('When enabled, completed todos will not be shown in the view')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideCompletedTodos)
				.onChange(async (value) => {
					this.plugin.settings.hideCompletedTodos = value;
					await this.plugin.saveSettings();
				}));

		// Hide blank todos
		new Setting(containerEl)
			.setName('Hide blank todos')
			.setDesc('When enabled, todos with no text content will not be shown in the view')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.hideBlankTodos)
				.onChange(async (value) => {
					this.plugin.settings.hideBlankTodos = value;
					await this.plugin.saveSettings();
				}));

		// Open in new leaf
		new Setting(containerEl)
			.setName('Open files in new leaf')
			.setDesc('When enabled, clicking on a todo will open the file in a new leaf instead of the current one')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.openInNewLeaf)
				.onChange(async (value) => {
					this.plugin.settings.openInNewLeaf = value;
					await this.plugin.saveSettings();
				}));

		// Enable inline editing
		new Setting(containerEl)
			.setName('Enable inline editing')
			.setDesc('When enabled, allows editing due dates and priority directly from the todo panel')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.enableInlineEditing)
				.onChange(async (value) => {
					this.plugin.settings.enableInlineEditing = value;
					await this.plugin.saveSettings();
				}));

		// Image display section
		containerEl.createEl('h3', { text: 'Image Display' });

		// Show images
		new Setting(containerEl)
			.setName('Show images')
			.setDesc('When enabled, images referenced in todos will be displayed in the sidebar')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showImages)
				.onChange(async (value) => {
					this.plugin.settings.showImages = value;
					await this.plugin.saveSettings();
				}));

		// Auto collapse images
		new Setting(containerEl)
			.setName('Auto-collapse images')
			.setDesc('When enabled, images will be collapsed by default and can be expanded by clicking')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoCollapseImages)
				.onChange(async (value) => {
					this.plugin.settings.autoCollapseImages = value;
					await this.plugin.saveSettings();
				}));
	}

	private renderGroupingCriteria(containerEl: HTMLElement) {
		const criteriaContainer = containerEl.createDiv('grouping-criteria-container');
		
		// Add criterion button
		const addButton = criteriaContainer.createEl('button', {
			text: 'Add Grouping Criterion',
			cls: 'add-criterion-btn'
		});
		
		addButton.addEventListener('click', () => {
			const newCriterion: GroupingCriterion = {
				id: `criterion-${Date.now()}`,
				type: 'page',
				enabled: true,
				order: this.plugin.settings.groupingCriteria.length
			};
			
			this.plugin.settings.groupingCriteria.push(newCriterion);
			this.plugin.saveSettings();
			this.display(); // Refresh the entire settings display
		});

		// Render existing criteria
		const criteriaList = criteriaContainer.createDiv('criteria-list');
		
		for (const criterion of this.plugin.settings.groupingCriteria.sort((a, b) => a.order - b.order)) {
			this.renderSingleCriterion(criteriaList, criterion);
		}
	}

	private renderSingleCriterion(container: HTMLElement, criterion: GroupingCriterion) {
		const criterionEl = container.createDiv('grouping-criterion');
		
		// Drag handle
		const dragHandle = criterionEl.createEl('span', { 
			text: '⋮⋮',
			cls: 'drag-handle'
		});
		
		// Enable/disable toggle
		const toggleEl = criterionEl.createEl('input', {
			type: 'checkbox',
			cls: 'criterion-toggle'
		});
		toggleEl.checked = criterion.enabled;
		toggleEl.addEventListener('change', async () => {
			criterion.enabled = toggleEl.checked;
			await this.plugin.saveSettings();
		});

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
			this.display(); // Refresh to show/hide property selector
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
			cls: 'remove-criterion-btn'
		});
		
		removeBtn.addEventListener('click', async () => {
			const index = this.plugin.settings.groupingCriteria.findIndex(c => c.id === criterion.id);
			if (index !== -1) {
				this.plugin.settings.groupingCriteria.splice(index, 1);
				// Reorder remaining criteria
				this.plugin.settings.groupingCriteria.forEach((c, i) => c.order = i);
				await this.plugin.saveSettings();
				this.display(); // Refresh display
			}
		});

		// Add drag and drop functionality
		criterionEl.draggable = true;
		
		criterionEl.addEventListener('dragstart', (e) => {
			if (e.dataTransfer) {
				e.dataTransfer.setData('text/plain', criterion.id);
			}
		});
		
		criterionEl.addEventListener('dragover', (e) => {
			e.preventDefault();
		});
		
		criterionEl.addEventListener('drop', async (e) => {
			e.preventDefault();
			if (e.dataTransfer) {
				const draggedId = e.dataTransfer.getData('text/plain');
				const draggedIndex = this.plugin.settings.groupingCriteria.findIndex(c => c.id === draggedId);
				const targetIndex = this.plugin.settings.groupingCriteria.findIndex(c => c.id === criterion.id);
				
				if (draggedIndex !== -1 && targetIndex !== -1 && draggedIndex !== targetIndex) {
					// Reorder the criteria
					const draggedCriterion = this.plugin.settings.groupingCriteria[draggedIndex];
					this.plugin.settings.groupingCriteria.splice(draggedIndex, 1);
					this.plugin.settings.groupingCriteria.splice(targetIndex, 0, draggedCriterion);
					
					// Update order values
					this.plugin.settings.groupingCriteria.forEach((c, i) => c.order = i);
					
					await this.plugin.saveSettings();
					this.display(); // Refresh display
				}
			}
		});
	}
} 