# Changelog

All notable changes to the Todo Extended Plugin will be documented in this file.

## [1.0.0] - 2024-01-20

### Added
- **Comprehensive Todo Detection**: Automatically finds all checkbox-based todos throughout your vault
- **Smart Filtering**: Toggle to hide blank todos and filter by most recent daily notes
- **Hierarchical Task Support**: Properly displays parent and child tasks with visual indentation
- **Linked Note Integration**: Automatically detects `[[Note Links]]` and provides direct navigation with link icons
- **Image Support**: Display images referenced in todos with collapsible/expandable interface
- **Advanced Multi-Level Grouping**: Create multiple grouping criteria with drag-and-drop reordering
- **Dynamic Property Detection**: Automatically discovers and offers all available frontmatter properties for grouping
- **Compact Modern UI**: Space-efficient design with file icons for cleaner display
- **Calendar Date Picker**: Click due dates to open an elegant calendar popup for easy date setting
- **Customizable Date Formats**: Configure both input format and display format for due dates
- **Priority System**: Add priority levels (high, medium, low) with visual indicators and sorting
- **Inline Priority Editing**: Change priorities directly from dropdown menus in the sidebar
- **Interactive Sidebar**: View and manage todos in a dedicated right panel
- **Click Navigation**: Click on todos to jump directly to their location in files
- **Checkbox Toggle**: Check/uncheck todos directly from the sidebar view
- **Visual Indicators**: Color-coded due dates (overdue in red, today in yellow) and priority levels
- **Backwards Compatibility**: All edits preserve original file format and syntax

### Technical Features
- TypeScript implementation with full type safety
- Modern CSS with Obsidian theme compatibility
- Efficient regex-based todo parsing
- Moment.js integration for date handling
- Drag-and-drop interface for grouping configuration
- Mobile-responsive design

### Settings
- Filter most recent daily note only
- Customizable due date format (`due:%date%`)
- Customizable date input format (YYYY-MM-DD, DD/MM/YYYY, etc.)
- Customizable date display format (MMM DD, DD/MM, etc.)
- Priority format configuration
- Advanced multi-level grouping with dynamic property detection
- Image display controls (show/hide, auto-collapse)
- Various UI and behavior toggles

## [Unreleased]

### Added
- Enhanced task display: Due dates and priorities are now parsed from task names and displayed separately as metadata, keeping the task list clean and organized.
  - Task text like `Get more information on RFC2544 Testing kit from marshalltown !due:2025-06-29` will now display as just `Get more information on RFC2544 Testing kit from marshalltown` with the due date shown separately
  - Supports multiple due date formats: `due:YYYY-MM-DD`, `!due:YYYY-MM-DD`, and custom formats defined in settings
  - Priority indicators (e.g., `!high`, `!medium`, `!low`) are also stripped from display text but preserved as metadata
- Advanced sorting functionality in the todo panel:
  - Sort todos by priority, due date, file name, folder name, task text, created date, or order in file
  - Toggle between ascending and descending sort order with a single click
  - Multi-level sorting: grouping is applied first, then sorting within each group
  - Configurable default sorting criteria in settings
  - Real-time sorting control directly in the todo panel
- Compact text-based control interface:
  - Replaced emoji icons with clean text buttons (Filter, Group, Sort, Refresh)
  - Buttons toggle inline panels instead of modal dialogs for better workflow
  - Consistent with Obsidian's design language and accessibility standards
- Advanced search and filtering capabilities:
  - Text search across task content
  - Page name filtering
  - Priority-based filtering (High, Medium, Low, None)
  - Due date range filtering with from/to date pickers
  - Linked notes filter (show only tasks with [[links]])
  - Completion status filter (show only completed tasks)
  - Compact inline panel interface with apply/clear functionality
- Improved priority display and interaction:
  - When priority is set, shows only the colored priority tag (eliminates duplicate text)
  - Clickable priority tags for quick editing when inline editing is enabled
  - "No Priority" selector only appears when no priority is assigned
  - Eliminates visual clutter and redundant information display
- Inline panel-based grouping controls:
  - Full grouping functionality in a collapsible inline panel
  - Dynamic grouping criteria management with "Add" button
  - Supports all grouping options: page, folder, tag, property, due date, and priority
  - Custom property grouping with dropdown selection from available frontmatter properties
  - Individual remove buttons for each grouping criterion
- Inline panel-based sorting controls:
  - Complete sorting interface in a collapsible inline panel
  - All sorting options available with direction toggles
  - Multi-level sorting configuration 