import { TFile, moment } from 'obsidian';

export type TodoPriority = 'none' | 'low' | 'medium' | 'high';

export interface TodoItem {
	id: string;
	text: string;
	completed: boolean;
	file: TFile;
	line: number;
	indent: number;
	dueDate: moment.Moment | null;
	priority: TodoPriority;
	tags: string[];
	properties: Record<string, any>;
	originalText: string; // For backwards compatibility
	linkedNotes: string[]; // Extract linked notes
	displayText: string; // Text without wiki links for display
	images: string[]; // Extract images for display
}

export interface TodoGroup {
	name: string;
	todos: TodoItem[];
}

export type GroupByOption = 'none' | 'page' | 'folder' | 'tag' | 'property' | 'dueDate' | 'priority';

export interface GroupingCriterion {
	id: string;
	type: GroupByOption;
	property?: string;
	enabled: boolean;
	order: number;
}

export type SortByOption = 'priority' | 'dueDate' | 'fileName' | 'folderName' | 'text' | 'createdDate' | 'line';

export interface SortingCriterion {
	type: SortByOption;
	direction: 'asc' | 'desc';
} 