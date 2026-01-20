# Mobile Responsive Setup

This document describes the mobile-responsive design implementation for the MVP-IQ app.

## Features Implemented

### 1. Mobile Hamburger Menu
- **Desktop**: Fixed sidebar on the left
- **Mobile**: Hidden sidebar with hamburger menu button
- Slide-in menu from the left on mobile
- Auto-closes when route changes
- Overlay background when open

### 2. Responsive Calendar Views
- **Desktop**: 7-column grid layout (one column per day)
- **Mobile**: Horizontal scrollable cards
- Touch-friendly slot buttons
- Optimized for thumb navigation
- Day labels visible on each card

### 3. Mobile-Optimized Dashboards
- **Player Dashboard**: Responsive tabs, stacked on mobile
- **Coach Dashboard**: Mobile-friendly team roster interface
- **Mentor Dashboard**: Compact submission list
- All dashboards use responsive padding and spacing

### 4. Touch-Friendly Forms
- **Inputs**: 16px font size (prevents iOS zoom)
- **Buttons**: Larger touch targets (min 44x44px)
- **Text Areas**: Appropriate sizing for mobile
- **Selects**: Full-width on mobile, auto-width on desktop
- `touch-manipulation` CSS class prevents double-tap zoom

### 5. Responsive Modals
- Full-screen on mobile with proper padding
- Scrollable content if too tall
- Touch-friendly close buttons
- Video player optimized for mobile viewing

### 6. Mobile Navigation
- Compact navbar on mobile
- Shortened text labels ("Dash" instead of "Dashboard")
- Touch-friendly buttons
- Proper spacing for thumb reach

## Breakpoints

The app uses Tailwind's default breakpoints:
- **sm**: 640px (small tablets and up)
- **md**: 768px (tablets and up)
- **lg**: 1024px (desktops and up)

## Mobile-Specific Features

### Touch Targets
- All interactive elements are at least 44x44px
- Proper spacing between clickable items
- `touch-manipulation` class prevents double-tap zoom

### Input Optimization
- Font size set to 16px to prevent iOS auto-zoom
- Proper keyboard types (email, password, etc.)
- Autocomplete attributes where appropriate

### Layout Adjustments
- **Sidebar**: Hidden on mobile, hamburger menu
- **Calendar**: Horizontal scroll on mobile
- **Grids**: Single column on mobile, multi-column on desktop
- **Spacing**: Reduced padding/margins on mobile

## CSS Improvements

### Global Styles (`app/globals.css`)
```css
/* Prevent double-tap zoom on buttons */
button, a {
  touch-action: manipulation;
}

/* Mobile-friendly form inputs */
@media (max-width: 640px) {
  input, textarea, select {
    font-size: 16px; /* Prevents zoom on iOS */
  }
}
```

### Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes" />
```

## Testing Checklist

### Mobile Testing
- [ ] Test on iPhone (Safari)
- [ ] Test on Android (Chrome)
- [ ] Test on iPad (tablet view)
- [ ] Test landscape orientation
- [ ] Test portrait orientation

### Touch Interactions
- [ ] Sidebar menu opens/closes smoothly
- [ ] Calendar scrolls horizontally
- [ ] Buttons are easy to tap
- [ ] Forms are easy to fill
- [ ] Modals are easy to dismiss

### Layout
- [ ] No horizontal scrolling (except calendar)
- [ ] Text is readable without zooming
- [ ] Images/videos scale properly
- [ ] Navigation is accessible
- [ ] Content doesn't overflow

## Key Components Updated

1. **Sidebar** (`components/layout/Sidebar.tsx`)
   - Hamburger menu for mobile
   - Fixed positioning on desktop
   - Slide-in animation

2. **Calendar Views** (`components/calendar/*`)
   - Horizontal scroll on mobile
   - Grid layout on desktop
   - Touch-friendly slot buttons

3. **Dashboards** (`components/dashboard/*`)
   - Responsive tabs
   - Mobile-optimized spacing
   - Compact layouts

4. **Forms** (`components/video/*`, `components/feedback/*`)
   - 16px font inputs
   - Touch-friendly buttons
   - Responsive layouts

5. **Modals** (`components/video/VideoPlayerModal.tsx`)
   - Mobile-optimized sizing
   - Touch-friendly controls
   - Proper video playback

## Browser Compatibility

Tested and optimized for:
- iOS Safari
- Chrome (Android)
- Firefox Mobile
- Samsung Internet
- Edge Mobile

## Performance

- Optimized images and videos
- Lazy loading where appropriate
- Efficient CSS (Tailwind JIT)
- Minimal JavaScript overhead

## Accessibility

- Proper ARIA labels
- Keyboard navigation support
- Screen reader friendly
- Color contrast compliant
- Touch target sizes meet WCAG guidelines
