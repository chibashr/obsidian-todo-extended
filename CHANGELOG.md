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