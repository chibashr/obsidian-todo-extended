import { Plugin, WorkspaceLeaf, TFile, CachedMetadata, moment } from 'obsidian';
import { TodoExtendedView, VIEW_TYPE_TODO_EXTENDED } from './src/TodoExtendedView';
import { TodoExtendedSettings, TodoExtendedSettingTab, DEFAULT_SETTINGS } from './src/Settings';
import { TodoItem, TodoGroup, TodoPriority, GroupingCriterion, SortingCriterion, SortByOption } from './src/types';

export default class TodoExtendedPlugin extends Plugin {
	settings!: TodoExtendedSettings;

	async onload() {
		await this.loadSettings();
		await this.scanAvailableProperties();

		// Register the view
		this.registerView(
			VIEW_TYPE_TODO_EXTENDED,
			(leaf) => new TodoExtendedView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('checkmark', 'Todo Extended', () => {
			this.activateView();
		});

		// Add command
		this.addCommand({
			id: 'open-todo-extended',
			name: 'Open Todo Extended View',
			callback: () => {
				this.activateView();
			}
		});

		// Add settings tab
		this.addSettingTab(new TodoExtendedSettingTab(this.app, this));

		// Register events
		this.registerEvent(
			this.app.vault.on('modify', (file) => {
				if (file instanceof TFile) {
					this.refreshTodos();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('create', (file) => {
				if (file instanceof TFile) {
					this.refreshTodos();
				}
			})
		);

		this.registerEvent(
			this.app.vault.on('delete', (file) => {
				this.refreshTodos();
			})
		);
	}

	onunload() {
		// Clean up
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		await this.scanAvailableProperties();
		this.refreshTodos();
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_TODO_EXTENDED);

		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view doesn't exist, create a new leaf in the right sidebar for it
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_TODO_EXTENDED, active: true });
			}
		}

		// "Reveal" the leaf in case it is in a collapsed sidebar
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	refreshTodos() {
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO_EXTENDED);
		leaves.forEach((leaf) => {
			if (leaf.view instanceof TodoExtendedView) {
				leaf.view.refreshTodos();
			}
		});
	}

	async getAllTodos(): Promise<TodoGroup[]> {
		const files = this.app.vault.getMarkdownFiles();
		const nestedGroups = new Map<string, TodoItem[]>();

		for (const file of files) {
			// Skip if filtering by most recent daily note only
			if (this.settings.filterMostRecentDaily && this.isDailyNote(file)) {
				if (!this.isMostRecentDailyNote(file)) {
					continue;
				}
			}

			const content = await this.app.vault.read(file);
			const cache = this.app.metadataCache.getFileCache(file);
			const todos = this.extractTodosFromFile(file, content, cache);

			for (const todo of todos) {
				const groupKeys = this.getMultiLevelGroupKey(todo, file);
				const groupKey = groupKeys.join(' > ');
				if (!nestedGroups.has(groupKey)) {
					nestedGroups.set(groupKey, []);
				}
				nestedGroups.get(groupKey)!.push(todo);
			}
		}

		// Convert to hierarchical structure with proper child task handling
		const groups: TodoGroup[] = [];
		for (const [groupName, todos] of nestedGroups) {
			const sortedTodos = this.sortTodosWithHierarchy(todos);
			groups.push({
				name: groupName,
				todos: sortedTodos
			});
		}

		return groups.sort((a, b) => a.name.localeCompare(b.name));
	}

	private sortTodosWithHierarchy(todos: TodoItem[]): TodoItem[] {
		// Sort todos using the configured sorting criteria
		return todos.sort((a, b) => {
			// Apply each sorting criterion in order
			for (const criterion of this.settings.sortingCriteria) {
				const result = this.compareTodos(a, b, criterion);
				if (result !== 0) return result;
			}
			return 0;
		});
	}

	private compareTodos(a: TodoItem, b: TodoItem, criterion: SortingCriterion): number {
		let result = 0;
		
		switch (criterion.type) {
			case 'priority':
				const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2, 'none': 3 };
				result = priorityOrder[a.priority] - priorityOrder[b.priority];
				break;
			
			case 'dueDate':
				if (a.dueDate && b.dueDate) {
					result = a.dueDate.diff(b.dueDate);
				} else if (a.dueDate && !b.dueDate) {
					result = -1;
				} else if (!a.dueDate && b.dueDate) {
					result = 1;
				}
				break;
			
			case 'fileName':
				result = a.file.basename.localeCompare(b.file.basename);
				break;
			
			case 'folderName':
				const aFolder = a.file.parent?.path || '';
				const bFolder = b.file.parent?.path || '';
				result = aFolder.localeCompare(bFolder);
				break;
			
			case 'text':
				result = a.displayText.localeCompare(b.displayText);
				break;
			
			case 'createdDate':
				result = a.file.stat.ctime - b.file.stat.ctime;
				break;
			
			case 'line':
				// Compare file first, then line number to maintain hierarchy
				const fileCompare = a.file.path.localeCompare(b.file.path);
				if (fileCompare !== 0) {
					result = fileCompare;
				} else {
					result = a.line - b.line;
				}
				break;
		}
		
		// Apply direction (asc/desc)
		return criterion.direction === 'desc' ? -result : result;
	}

	private extractTodosFromFile(file: TFile, content: string, cache: CachedMetadata | null): TodoItem[] {
		const todos: TodoItem[] = [];
		const lines = content.split('\n');

		lines.forEach((line, index) => {
			const todoMatch = line.match(/^(\s*)(- \[[ x]\])\s*(.*)$/);
			if (todoMatch) {
				const [, indent, checkbox, text] = todoMatch;
				const isCompleted = checkbox.includes('x');
				
				// Skip completed todos if setting is enabled
				if (isCompleted && this.settings.hideCompletedTodos) {
					return;
				}

				// Skip blank todos if setting is enabled
				if (text.trim() === '' && this.settings.hideBlankTodos) {
					return;
				}

				const todo: TodoItem = {
					id: `${file.path}:${index}`,
					text: text.trim(),
					completed: isCompleted,
					file: file,
					line: index,
					indent: indent.length,
					dueDate: this.extractDueDate(text),
					priority: this.extractPriority(text),
					tags: this.extractTags(text),
					properties: this.extractProperties(cache),
					originalText: line,
					linkedNotes: this.extractLinkedNotes(text),
					displayText: this.createDisplayText(text),
					images: this.extractImages(text)
				};

				todos.push(todo);
			}
		});

		return todos;
	}

	private extractDueDate(text: string): moment.Moment | null {
		// Extract due date based on settings format
		const dateFormat = this.settings.dateInputFormat;
		const dueDatePattern = this.settings.dueDateFormat.replace('%date%', `([^\\s]+)`);
		let match = text.match(new RegExp(dueDatePattern));
		if (match) {
			const dateStr = match[1];
			const parsedDate = moment(dateStr, dateFormat, true); // strict parsing
			if (parsedDate.isValid()) {
				return parsedDate;
			}
		}
		
		// Also try common variations that might not match exact settings
		// Try !due:YYYY-MM-DD pattern (common variation)
		match = text.match(/!due:([^\s]+)/i);
		if (match) {
			const dateStr = match[1];
			const parsedDate = moment(dateStr, dateFormat, true); // strict parsing
			if (parsedDate.isValid()) {
				return parsedDate;
			}
		}
		
		// Try due:YYYY-MM-DD pattern (without !)
		match = text.match(/due:([^\s]+)/i);
		if (match) {
			const dateStr = match[1];
			const parsedDate = moment(dateStr, dateFormat, true); // strict parsing
			if (parsedDate.isValid()) {
				return parsedDate;
			}
		}
		
		return null;
	}

	private extractPriority(text: string): TodoPriority {
		// Extract priority based on settings format
		const priorityPattern = this.settings.priorityFormat.replace('%priority%', '(high|medium|low)');
		const match = text.match(new RegExp(priorityPattern, 'i'));
		if (match) {
			return match[1].toLowerCase() as TodoPriority;
		}
		return 'none';
	}

	private extractTags(text: string): string[] {
		const tagMatches = text.match(/#[\w-]+/g);
		return tagMatches ? tagMatches.map(tag => tag.substring(1)) : [];
	}

	private extractProperties(cache: CachedMetadata | null): Record<string, any> {
		return cache?.frontmatter || {};
	}

	private extractLinkedNotes(text: string): string[] {
		const linkMatches = text.match(/\[\[([^\]]+)\]\]/g);
		if (!linkMatches) return [];
		
		return linkMatches.map(link => {
			// Remove the [[ ]] brackets and get the note name
			const noteName = link.slice(2, -2);
			// Handle aliases - take only the part before |
			return noteName.split('|')[0];
		});
	}

	private createDisplayText(text: string): string {
		// Replace [[Note Name]] with just Note Name and remove image references
		let displayText = text.replace(/\[\[([^\]]+)\]\]/g, (match, noteName) => {
			// Handle aliases - take the display text after | or the note name
			const parts = noteName.split('|');
			return parts.length > 1 ? parts[1] : parts[0];
		});
		
		// Remove markdown image syntax from display text
		displayText = displayText.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
		displayText = displayText.replace(/!\[\[([^\]]+)\]\]/g, '');
		
		// Remove due date pattern from display text
		const dueDatePattern = this.settings.dueDateFormat.replace('%date%', '[^\\s]+');
		displayText = displayText.replace(new RegExp('\\s*' + dueDatePattern, 'g'), '');
		
		// Remove priority pattern from display text
		const priorityPattern = this.settings.priorityFormat.replace('%priority%', '(high|medium|low)');
		displayText = displayText.replace(new RegExp('\\s*' + priorityPattern, 'gi'), '');
		
		// Also handle common variations that might not match exact settings
		// Remove !due:YYYY-MM-DD pattern (common variation)
		displayText = displayText.replace(/\s*!due:[^\s]+/gi, '');
		// Remove due:YYYY-MM-DD pattern (without !)
		displayText = displayText.replace(/\s*due:[^\s]+/gi, '');
		// Clean up any trailing ! characters that might be left behind
		displayText = displayText.replace(/\s*!\s*$/, '');
		
		return displayText.trim();
	}

	private extractImages(text: string): string[] {
		const images: string[] = [];
		
		// Extract markdown format images: ![alt](path)
		const markdownImageMatches = text.match(/!\[[^\]]*\]\(([^)]+)\)/g);
		if (markdownImageMatches) {
			markdownImageMatches.forEach(match => {
				const pathMatch = match.match(/!\[[^\]]*\]\(([^)]+)\)/);
				if (pathMatch) {
					const imagePath = pathMatch[1];
					// For markdown images, use the path as-is
					images.push(imagePath);
				}
			});
		}
		
		// Extract wiki-style images: ![[image.png]]
		const wikiImageMatches = text.match(/!\[\[([^\]]+)\]\]/g);
		if (wikiImageMatches) {
			wikiImageMatches.forEach(match => {
				const pathMatch = match.match(/!\[\[([^\]]+)\]\]/);
				if (pathMatch) {
					const imageName = pathMatch[1];
					// Find the file in the vault
					const imageFile = this.app.vault.getFiles().find(f => 
						f.name === imageName || f.basename === imageName
					);
					if (imageFile) {
						const resourcePath = this.app.vault.getResourcePath(imageFile);
						images.push(resourcePath);
					}
				}
			});
		}
		
		return images;
	}



	private isDailyNote(file: TFile): boolean {
		// Simple heuristic - check if filename matches date pattern
		const datePattern = /^\d{4}-\d{2}-\d{2}$/;
		return datePattern.test(file.basename);
	}

	private isMostRecentDailyNote(file: TFile): boolean {
		const files = this.app.vault.getMarkdownFiles();
		const dailyNotes = files.filter(f => this.isDailyNote(f));
		
		if (dailyNotes.length === 0) return false;
		
		// Sort by basename (which should be date) and get the most recent
		dailyNotes.sort((a, b) => b.basename.localeCompare(a.basename));
		return dailyNotes[0].path === file.path;
	}

	async toggleTodo(todoId: string) {
		const [filePath, lineStr] = todoId.split(':');
		const line = parseInt(lineStr);
		const file = this.app.vault.getAbstractFileByPath(filePath);
		
		if (!(file instanceof TFile)) return;
		
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		
		if (line < lines.length) {
			const currentLine = lines[line];
			const newLine = currentLine.replace(/- \[[ x]\]/, (match) => {
				return match.includes('x') ? '- [ ]' : '- [x]';
			});
			
			lines[line] = newLine;
			await this.app.vault.modify(file, lines.join('\n'));
		}
	}

	async updateTodoDueDate(todoId: string, dueDate: moment.Moment | null) {
		const [filePath, lineStr] = todoId.split(':');
		const line = parseInt(lineStr);
		const file = this.app.vault.getAbstractFileByPath(filePath);
		
		if (!(file instanceof TFile)) return;
		
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		
		if (line < lines.length) {
			let currentLine = lines[line];
			
			// Remove existing due date
			const dueDatePattern = this.settings.dueDateFormat.replace('%date%', '[^\\s]+');
			currentLine = currentLine.replace(new RegExp('\\s*' + dueDatePattern), '');
			
			// Add new due date if provided
			if (dueDate) {
				const dueDateStr = this.settings.dueDateFormat.replace('%date%', dueDate.format(this.settings.dateInputFormat));
				currentLine = currentLine.trim() + ' ' + dueDateStr;
			}
			
			lines[line] = currentLine;
			await this.app.vault.modify(file, lines.join('\n'));
		}
	}

	async updateTodoPriority(todoId: string, priority: TodoPriority) {
		const [filePath, lineStr] = todoId.split(':');
		const line = parseInt(lineStr);
		const file = this.app.vault.getAbstractFileByPath(filePath);
		
		if (!(file instanceof TFile)) return;
		
		const content = await this.app.vault.read(file);
		const lines = content.split('\n');
		
		if (line < lines.length) {
			let currentLine = lines[line];
			
			// Remove existing priority
			const priorityPattern = this.settings.priorityFormat.replace('%priority%', '(high|medium|low)');
			currentLine = currentLine.replace(new RegExp('\\s*' + priorityPattern, 'i'), '');
			
			// Add new priority if not 'none'
			if (priority !== 'none') {
				const priorityStr = this.settings.priorityFormat.replace('%priority%', priority);
				currentLine = currentLine.trim() + ' ' + priorityStr;
			}
			
			lines[line] = currentLine;
			await this.app.vault.modify(file, lines.join('\n'));
		}
	}

	async scanAvailableProperties(): Promise<void> {
		const files = this.app.vault.getMarkdownFiles();
		const properties = new Set<string>();

		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter) {
				Object.keys(cache.frontmatter).forEach(key => {
					if (key !== 'position' && !key.startsWith('_')) {
						properties.add(key);
					}
				});
			}
		}

		this.settings.availableProperties = Array.from(properties).sort();
	}

	getMultiLevelGroupKey(todo: TodoItem, file: TFile): string[] {
		const keys: string[] = [];
		
		for (const criterion of this.settings.groupingCriteria.filter(c => c.enabled).sort((a, b) => a.order - b.order)) {
			let key = '';
			switch (criterion.type) {
				case 'page':
					key = file.basename;
					break;
				case 'folder':
					key = file.parent?.name || 'Root';
					break;
				case 'tag':
					key = todo.tags.length > 0 ? `#${todo.tags[0]}` : 'No Tag';
					break;
				case 'property':
					if (criterion.property) {
						const propValue = todo.properties[criterion.property];
						key = propValue ? String(propValue) : `No ${criterion.property}`;
					} else {
						key = 'No Property';
					}
					break;
				case 'dueDate':
					key = todo.dueDate ? todo.dueDate.format('YYYY-MM-DD') : 'No Due Date';
					break;
				case 'priority':
					key = todo.priority === 'none' ? 'No Priority' : `${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)} Priority`;
					break;
				default:
					key = 'All Todos';
			}
			keys.push(key);
		}
		
		return keys.length > 0 ? keys : ['All Todos'];
	}
} 