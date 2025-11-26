# My Activity Module

This module contains all components and utilities for the "My Activity" tab feature.

## Structure

```
activity/
├── index.ts                      # Barrel export for clean imports
├── types.ts                      # TypeScript interfaces and constants
├── utils.ts                      # Utility functions (formatTimeAgo, formatFileSize)
├── activity-card-header.tsx      # Header with title and Clear All button
├── empty-state.tsx               # Empty state when no tasks exist
├── task-item.tsx                 # Individual task card component
└── confirmation-dialogs.tsx      # Delete and Clear All confirmation dialogs
```

## Components

### `ActivityCardHeader`
- Displays the "My Activity" title with icon
- Shows "Clear All" button when tasks exist
- Props: `taskCount`, `onClearAll`

### `EmptyState`
- Displays when no tasks are present
- Shows clock icon and helpful message

### `TaskItem`
- Renders individual task information
- Shows task name, URL, file type, file size
- Displays timestamp with human-readable format
- Includes delete button
- Props: `task`, `onDelete`

### `DeleteTaskDialog`
- Confirmation dialog for deleting a single task
- Props: `open`, `onOpenChange`, `onConfirm`

### `ClearAllDialog`
- Confirmation dialog for clearing all tasks
- Shows task count in message
- Props: `open`, `onOpenChange`, `onConfirm`, `taskCount`

## Utilities

### `formatTimeAgo(timestamp: number): string`
Converts timestamp to human-readable format:
- "just now" (< 1 minute)
- "5 minutes ago"
- "2 hours ago"
- "3 days ago"
- Full date (> 7 days)

### `formatFileSize(bytes: string | number | undefined): string`
Converts bytes to human-readable format:
- Supports B, KB, MB, GB, TB
- Returns empty string if no size provided

## Types

### `LocalTask`
```typescript
interface LocalTask {
  id: string;
  url: string;
  status: string;
  timestamp: number;
  name?: string;
  file_size?: string;
  file_type?: string;
}
```

### `STORAGE_KEY`
Constant for localStorage key: `"pikpak_user_tasks"`

## Usage

```typescript
import { MyActivityTab } from "@/components/features/downloads/my-activity-tab";

// In your page
<MyActivityTab />
```

## Data Flow

1. Tasks are loaded from localStorage on mount
2. User can delete individual tasks (with confirmation)
3. User can clear all tasks (with confirmation)
4. All changes are persisted to localStorage
5. Task information comes from both PikPak API and WhatsLink API responses

