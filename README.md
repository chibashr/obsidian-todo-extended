# Todo Extended Plugin for Obsidian
Vibe Code with Love

An advanced todo management plugin for Obsidian that provides enhanced filtering, grouping, and daily notes integration.

## Features

- **Comprehensive Todo Detection**: Automatically finds all checkbox-based todos throughout your vault
- **Smart Filtering**: Toggle to hide blank todos and filter by most recent daily notes
- **Hierarchical Task Support**: Properly displays parent and child tasks with visual indentation
- **Linked Note Integration**: Automatically detects `[[Note Links]]` and provides direct navigation buttons
- **Image Support**: Display images referenced in todos with collapsible/expandable interface
- **Advanced Multi-Level Grouping**: Create multiple grouping criteria with drag-and-drop reordering
- **Dynamic Property Detection**: Automatically discovers and offers all available frontmatter properties for grouping
- **Compact Modern UI**: Space-efficient design with file icons instead of full names for cleaner display
- **Calendar Date Picker**: Click due dates to open an elegant calendar popup for easy date setting
- **Customizable Date Format**: Configure both input format and display format for due dates
- **Priority System**: Add priority levels (high, medium, low) with visual indicators and sorting
- **Inline Priority Editing**: Change priorities directly from dropdown menus in the sidebar
- **Interactive Sidebar**: View and manage todos in a dedicated right panel
- **Click Navigation**: Click on todos to jump directly to their location in files
- **Checkbox Toggle**: Check/uncheck todos directly from the sidebar view
- **Visual Indicators**: Color-coded due dates (overdue in red, today in yellow) and priority levels
- **Backwards Compatibility**: All edits preserve original file format and syntax

## Settings

### Filter Most Recent Daily Note Only
When enabled, only shows todos from the most recent daily note to prevent duplicates from tasks that roll over between days.

### Due Date Format
Customize how due dates appear in your tasks. Use `%date%` as a placeholder for the date.
- Default: `due:%date%`
- Example: `- [ ] Complete project due:15/01/2024` (when using DD/MM/YYYY format)

### Date Input Format
Customize how dates should be entered in tasks. Uses moment.js format strings.
- Default: `YYYY-MM-DD`
- Options: `DD/MM/YYYY`, `MM-DD-YYYY`, `DD-MM-YY`, etc.
- Example: Set to `DD/MM/YYYY` to write dates as "15/01/2024"

### Date Display Format
Customize how due dates are displayed in the todo list. Uses moment.js format strings.
- Default: `MMM DD` (displays as "Jan 15")
- Options: `YYYY-MM-DD`, `DD/MM`, `MM/DD/YYYY`, etc.
- Example: Change to `DD/MM` to display "15/01" instead of "Jan 15"

### Priority Format
Customize how priority indicators appear in your tasks. Use `%priority%` as placeholder for the priority level.
- Default: `!%priority%`
- Example: `- [ ] Important task !high`
- Supported priorities: high, medium, low

### Advanced Multi-Level Grouping
Create sophisticated grouping hierarchies:
- **Multiple Criteria**: Add multiple grouping levels (e.g., Customer > Project > Priority)
- **Drag and Drop**: Reorder grouping criteria by dragging
- **Toggle Enable/Disable**: Turn individual criteria on/off without removing them
- **Dynamic Properties**: Automatically detects available frontmatter properties (customer, project, people, etc.)
- **Nested Display**: Results show as "Customer > Project > Priority" hierarchies

### Image Display
- **Show Images**: When enabled, images referenced in todos will be displayed in the sidebar
- **Auto-collapse Images**: When enabled, images will be collapsed by default with a toggle button to expand them

### Additional Options
- **Hide Completed Todos**: Option to hide completed todos from the view
- **Hide Blank Todos**: Option to hide todos with no text content
- **Open Files in New Leaf**: When clicking on todos, open files in new tabs instead of replacing current view
- **Enable Inline Editing**: Allow editing priorities directly and due dates via calendar popup

## Usage

1. **Open the Todo View**: Click the checkmark icon in the ribbon or use the command palette to search for "Open Todo Extended View"
2. **Configure Grouping**: In settings, set up your advanced multi-level grouping criteria
3. **View Your Todos**: The plugin will scan your vault and display all todos organized according to your grouping hierarchy
4. **Navigate to Todos**: Click on any todo text or file name to jump to that location
5. **Navigate to Linked Notes**: Click the arrow buttons (→ Note Name) to open linked notes directly
6. **Toggle Completion**: Use the checkboxes to mark todos as complete or incomplete
7. **Edit Due Dates**: Click on due date badges to open a calendar popup for easy date selection
8. **Edit Priorities**: Use dropdown menus to change priority levels directly in the sidebar
9. **Manage Grouping**: Add, remove, reorder, and toggle grouping criteria in the settings
10. **Refresh**: Click the refresh button (↻) to update the todo list

## Todo Format Support

The plugin recognizes standard Markdown checkbox format, including hierarchical tasks and linked notes:
```markdown
- [ ] Uncompleted todo
- [x] Completed todo
- [ ] Todo with due date due:2024-01-15
- [ ] Todo with priority !high
- [ ] Todo with both due:2024-01-15 !medium
- [ ] Todo with tags #work #urgent

# Image support (images display in sidebar, can be collapsed/expanded)
- [ ] Review network diagram ![Network Diagram](path/to/diagram.png)
- [ ] Check server photos ![[server-room-photo.jpg]]
- [ ] Update documentation with ![[network-topology.png]] and ![Cable Layout](cables.jpg)

# Hierarchical tasks (parent-child relationships)
- [ ] Create a ring between NEC and Aviat
    - [ ] Research how to make a ring
    - [ ] Plan test ring configuration
        - [ ] Contact network team
        - [ ] Schedule maintenance window
    - [ ] Implement test ring for proof of concept
    - [ ] Plan ring configuration
    - [ ] Implement ring configuration

# With frontmatter for advanced grouping
---
customer: ACME Corp
project: Network Upgrade
people: [John, Sarah]
---
- [ ] Configure new switches due:2024-01-20 !high
    - [ ] Update firmware
    - [ ] Configure VLANs

# Blank todos (hidden by default)
- [ ] 
- [ ]    
```

## Installation

1. Download the plugin files
2. Place them in your `.obsidian/plugins/obsidian-todo-extended/` folder
3. Enable the plugin in Obsidian's Community Plugins settings

## Building from Source

```bash
npm install
npm run build
```

## Use Cases

### Use Case 1: Daily Task Management
Enable "Filter most recent daily note only" to see only today's tasks without duplicates from previous days. Use multi-level grouping: Priority > Due Date to see high-priority overdue items first.

### Use Case 2: Client Project Management
Set up grouping: Customer > Project > Priority. Your todos will be organized like:
- **ACME Corp > Network Upgrade > High Priority**
  - Configure new switches !high due:2024-01-20
    - Update firmware
    - Configure VLANs
- **ACME Corp > Network Upgrade > Medium Priority**
  - Document configuration !medium

### Use Case 3: Team Coordination
Group by: People > Project > Due Date to see who's responsible for what and when.

### Use Case 4: Hierarchical Task Breakdown
Create parent tasks with subtasks that maintain their relationship in the sidebar:
- Main project milestones as parent tasks
- Detailed action items as child tasks
- Sub-tasks with additional nesting levels

### Use Case 5: Linked Note Management
Handle todos that reference other notes seamlessly:
- **Review [[Network Documentation]]** displays as "Review Network Documentation" with a direct link button
- Click the arrow button to jump directly to the referenced note
- Maintains clean text display while preserving functionality

### Use Case 6: Quick Task Overview
Keep the Todo Extended view open in the right sidebar for constant visibility of all pending tasks across your vault, with compact cards that show more information in less space.

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License 
