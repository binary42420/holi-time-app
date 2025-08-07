# Job Timeline Manager - User Guide

## Overview
The Job Timeline Manager is a visual scheduling tool designed to provide comprehensive oversight of job scheduling status, worker assignments, and crew chief coordination. This tool is specifically optimized for desktop use during team meetings and scheduling reviews.

## Key Features

### 🎨 Visual Timeline Display
- **Gantt-style Timeline**: View all shifts as horizontal bars across dates
- **Color-coded Crew Chiefs**: Each crew chief is assigned a unique color for easy identification
- **Filled vs Unfilled Indicators**: Visual representation of staffing levels with two-tone bars
- **Multiple View Modes**: Switch between 1 week, 2 weeks, or 1 month views

### 🔍 Advanced Filtering & Search
- **Crew Chief Filter**: Focus on shifts assigned to specific crew chiefs
- **Status Filter**: Filter by shift status (Scheduled, In Progress, Completed)
- **Text Search**: Search shifts by description or location
- **Real-time Updates**: Auto-refresh capabilities for live data

### 📊 Staffing Analysis
- **Staffing Progress Bars**: Visual indicators showing fill percentage for each shift
- **Worker Type Breakdown**: Detailed view of crew chief, fork operators, stage hands, and general labor
- **Assignment Status**: Instant visual feedback on understaffed shifts
- **Completion Tracking**: Progress indicators for job completion rates

## How to Access

1. Navigate to any **Job Detail Page** (`/jobs/[id]`)
2. Click the **"Job Manager Timeline"** button next to the "Edit Job" button
3. The timeline opens in a new dedicated view optimized for scheduling meetings

## Using the Timeline

### Navigation Controls
- **Week Navigation**: Use arrow buttons to move between date ranges
- **View Mode Selector**: Choose between 1 week, 2 weeks, or 1 month views
- **Today Button**: Quick jump to current date
- **Zoom Controls**: Adjust timeline scale from 50% to 200%

### Timeline Elements

#### Shift Bars
- **Length**: Represents shift duration
- **Color**: Matches assigned crew chief's color
- **Fill Level**: Shows staffing percentage (darker = filled, lighter = unfilled)
- **Hover Info**: Detailed tooltip with shift information
- **Click to Select**: Opens detailed panel on the right

#### Color Legend
- Displays all crew chiefs and their assigned colors
- Toggle visibility with the settings button
- Helps identify crew chief assignments at a glance

### Detailed Shift Information
When you click on a shift bar, a detailed panel appears showing:
- **Worker Type Breakdown**: Visual slots for each worker type
- **Assignment Status**: Filled vs empty positions
- **Worker Names**: Individual worker assignments
- **Shift Metadata**: Date, time, location, and status

## Best Practices for Team Meetings

### 1. Pre-Meeting Preparation
- Use filters to focus on problematic areas
- Identify understaffed shifts using the visual indicators
- Note crew chief distribution across shifts

### 2. During Meetings
- Use fullscreen mode for better visibility
- Filter by crew chief to discuss individual workloads
- Use the detailed panels to review specific shift requirements
- Take advantage of the color coding to quickly identify patterns

### 3. Staffing Decisions
- **Red/Orange Bars**: Immediate attention needed (understaffed)
- **Yellow Bars**: Moderate staffing (75% filled)
- **Green Bars**: Fully staffed shifts
- Look for crew chief color distribution to balance workloads

## Visual Indicators Guide

### Staffing Levels
- 🔴 **Critical (0-40%)**: Red bars - immediate staffing needed
- 🟠 **Low (40-60%)**: Orange bars - staffing attention required
- 🟡 **Medium (60-80%)**: Yellow bars - nearly adequate
- 🟢 **Good (80-95%)**: Green bars - well staffed
- ✅ **Complete (95-100%)**: Dark green bars - fully staffed

### Shift Status Colors
- **Scheduled**: Standard crew chief color with opacity
- **In Progress**: Bright crew chief color
- **Completed**: Muted/grayed out appearance
- **Cancelled**: Red strikethrough pattern

## Keyboard Shortcuts
- **Arrow Keys**: Navigate between weeks
- **Spacebar**: Toggle detailed view for selected shift
- **Escape**: Close detailed panels
- **F**: Toggle fullscreen mode
- **R**: Refresh data

## Mobile Considerations
While optimized for desktop, the timeline is accessible on mobile devices with:
- Horizontal scrolling for timeline navigation
- Touch-friendly shift selection
- Responsive detailed panels
- Simplified controls for smaller screens

## Troubleshooting

### Common Issues
1. **Timeline appears empty**: Check date range and filters
2. **Colors not showing**: Verify crew chief assignments exist
3. **Slow performance**: Reduce date range or disable auto-refresh
4. **Missing data**: Use refresh button to update from server

### Performance Tips
- Use shorter date ranges for better performance
- Filter by crew chief when focusing on specific assignments
- Disable auto-refresh when not needed
- Use zoom controls to balance detail and overview

## Integration with Other Features
- **Direct Navigation**: Click shift bars to go to shift detail pages
- **Assignment Management**: Use alongside worker assignment tools
- **Reporting**: Timeline view is print-friendly for meeting handouts
- **Real-time Updates**: Integrates with live scheduling changes

This timeline manager transforms complex scheduling data into an intuitive visual interface, making it easier to identify staffing gaps, balance crew chief workloads, and make informed scheduling decisions during team meetings.