# ♿ Mobile Accessibility Testing Guide

## 🎯 Accessibility Standards Compliance

### WCAG 2.1 Level AA Checklist

#### 1. Perceivable
- [ ] **Color Contrast**: All text has contrast ratio ≥ 4.5:1 (normal text) or ≥ 3:1 (large text)
- [ ] **Non-text Contrast**: UI components have contrast ratio ≥ 3:1
- [ ] **Text Alternatives**: All images have meaningful alt text
- [ ] **Audio/Video**: Captions and transcripts available (if applicable)
- [ ] **Adaptable Content**: Content structure is preserved when stylesheets are disabled
- [ ] **Distinguishable**: Color is not the only way to convey information

#### 2. Operable  
- [ ] **Keyboard Accessible**: All functionality available via keyboard
- [ ] **No Seizures**: No content flashes more than 3 times per second
- [ ] **Navigable**: Page has proper heading structure (h1-h6)
- [ ] **Input Methods**: Touch targets are at least 44×44px
- [ ] **Timeouts**: Users can extend or disable time limits

#### 3. Understandable
- [ ] **Readable**: Content is written in clear, simple language
- [ ] **Predictable**: Navigation is consistent across pages
- [ ] **Input Assistance**: Form errors are clearly identified and described

#### 4. Robust
- [ ] **Compatible**: Content works with assistive technologies
- [ ] **Valid Code**: HTML validates without critical errors

## 📱 Mobile Screen Reader Testing

### iOS VoiceOver Testing Steps

1. **Enable VoiceOver**: Settings → Accessibility → VoiceOver → On
2. **Navigation Gestures**:
   - Swipe right: Next element
   - Swipe left: Previous element  
   - Double tap: Activate element
   - Three-finger swipe: Scroll

3. **Test Scenarios**:
   - [ ] **App Launch**: VoiceOver announces app name and first focusable element
   - [ ] **Navigation**: Can navigate to all major sections
   - [ ] **Task Creation**: Quick task creator is accessible and announces properly
   - [ ] **Kanban Board**: Column headers and task cards are readable
   - [ ] **Task Actions**: Edit/delete actions are accessible
   - [ ] **Modals**: Focus traps work correctly in modals/bottom sheets
   - [ ] **Forms**: All form fields have proper labels
   - [ ] **Error States**: Error messages are announced

### Android TalkBack Testing Steps

1. **Enable TalkBack**: Settings → Accessibility → TalkBack → On
2. **Navigation Gestures**:
   - Swipe right: Next element
   - Swipe left: Previous element
   - Double tap: Activate element
   - Swipe down then right: Reading controls

3. **Test Scenarios**: (Same as iOS VoiceOver)

## ⌨️ Keyboard Navigation Testing

### Desktop Keyboard Testing
- [ ] **Tab Order**: Logical tab sequence through all interactive elements
- [ ] **Focus Indicators**: Clear visual focus indicators on all focusable elements
- [ ] **Skip Links**: Skip navigation links for screen reader users
- [ ] **Escape Key**: Closes modals and cancels operations
- [ ] **Arrow Keys**: Navigate within component groups (if applicable)
- [ ] **Enter/Space**: Activate buttons and links

### Mobile Keyboard Testing  
- [ ] **External Keyboard**: App works with Bluetooth keyboards
- [ ] **Switch Control**: Compatible with iOS Switch Control
- [ ] **Voice Control**: Compatible with voice navigation commands

## 🎨 Visual Accessibility Testing

### Color and Contrast
```bash
# Tools for testing:
# - WebAIM Contrast Checker: webaim.org/resources/contrastchecker/
# - Colour Contrast Analyser: www.tpgi.com/color-contrast-checker/
# - Browser DevTools: Accessibility panel
```

**Test Cases**:
- [ ] **Primary Colors**: Blue (#1890ff) vs white backgrounds
- [ ] **Success Colors**: Green (#52c41a) vs backgrounds  
- [ ] **Warning Colors**: Orange (#faad14) vs backgrounds
- [ ] **Error Colors**: Red (#ff4d4f) vs backgrounds
- [ ] **Text Colors**: All text color combinations
- [ ] **Interactive States**: Hover, focus, active states
- [ ] **Disabled States**: Disabled button colors

### High Contrast Mode
- [ ] **Windows High Contrast**: Test in Windows high contrast mode
- [ ] **macOS Increase Contrast**: Test with increased contrast enabled
- [ ] **Custom High Contrast**: Elements remain distinguishable

### Low Vision Testing
- [ ] **200% Zoom**: Content remains usable at 200% browser zoom
- [ ] **400% Zoom**: Essential functionality works at 400% zoom  
- [ ] **Large Text**: All text scales properly with OS text size settings

## 🧠 Cognitive Accessibility

### Clear Communication
- [ ] **Simple Language**: Instructions use plain, clear language
- [ ] **Error Messages**: Errors explain what went wrong and how to fix it
- [ ] **Success Feedback**: Clear confirmation when actions complete
- [ ] **Progress Indicators**: Show progress for multi-step processes

### Reduced Motion
- [ ] **Prefers Reduced Motion**: Respects user's motion preferences
- [ ] **Animation Controls**: Users can disable animations
- [ ] **Essential Motion**: Only essential animations remain when reduced motion is enabled

## 🔧 Assistive Technology Testing

### Screen Magnifiers
- [ ] **ZoomText (Windows)**: UI remains usable with screen magnification
- [ ] **macOS Zoom**: Compatible with built-in zoom functionality
- [ ] **Mobile Zoom**: Works with pinch-to-zoom gestures

### Voice Control
- [ ] **Dragon NaturallySpeaking**: Voice commands work correctly
- [ ] **iOS Voice Control**: "Tap [element]" commands function
- [ ] **Android Voice Access**: Voice navigation is supported

### Switch Access
- [ ] **iOS Switch Control**: Can navigate using switch devices
- [ ] **Android Switch Access**: Switch navigation is functional
- [ ] **Focus Management**: Proper focus management for switch users

## 📋 Accessibility Testing Checklist

### Automated Testing Tools
```bash
# Run these tools regularly:
npm run test:a11y          # axe-core automated tests
npm run lighthouse:a11y    # Lighthouse accessibility audit
```

- [ ] **axe-core**: No violations in automated scan
- [ ] **Lighthouse**: Accessibility score ≥ 95
- [ ] **WAVE**: No errors in WAVE accessibility checker
- [ ] **Pa11y**: Command line accessibility testing passes

### Manual Testing Protocol

#### Daily Testing (5 minutes)
- [ ] Tab through main navigation
- [ ] Test one key user flow with keyboard only
- [ ] Verify focus indicators are visible
- [ ] Check color contrast of new components

#### Weekly Testing (30 minutes)  
- [ ] Full screen reader test of main flows
- [ ] Test with 200% browser zoom
- [ ] Verify all form errors are announced
- [ ] Test modal focus trapping

#### Release Testing (2 hours)
- [ ] Complete WCAG 2.1 AA checklist
- [ ] Test with multiple screen readers
- [ ] Verify all automated test results
- [ ] Document any known limitations

## 🎯 Accessibility Test Results Template

```markdown
# Accessibility Test Results

**Date**: [Date]
**Tester**: [Name]  
**Devices Tested**: [List]
**Screen Readers**: [VoiceOver, TalkBack, etc.]

## Summary
- **WCAG Level**: AA Compliant ✅/❌
- **Screen Reader**: Functional ✅/❌
- **Keyboard Navigation**: Complete ✅/❌
- **Color Contrast**: Meets Standards ✅/❌

## Issues Found
### High Priority
- [Issue description] - [Location] - [How to reproduce]

### Medium Priority  
- [Issue description] - [Location] - [How to reproduce]

### Low Priority
- [Issue description] - [Location] - [How to reproduce]

## Recommendations
1. [Specific improvement suggestion]
2. [Another improvement suggestion]

## Test Coverage
- [ ] Login/Registration Flow
- [ ] Main Navigation
- [ ] Task Creation (Quick + Full)
- [ ] Kanban Board Interaction
- [ ] Task Management (Edit/Delete)
- [ ] Settings and Profile
- [ ] Error States
- [ ] Loading States
```

## 🚀 Accessibility Quick Wins

### Easy Fixes (< 1 hour)
- Add missing alt text to images
- Improve button labels with aria-label
- Fix heading hierarchy order
- Add skip navigation links
- Ensure minimum color contrast

### Medium Effort (1-4 hours)
- Implement focus trapping in modals
- Add live regions for dynamic content
- Improve error message associations
- Optimize tab order
- Add landmark regions

### Larger Projects (> 4 hours)
- Comprehensive keyboard navigation
- Full screen reader optimization
- High contrast theme implementation
- Voice control compatibility
- Switch navigation support

---

**Remember**: Accessibility is not a checklist item - it's an ongoing commitment to inclusive design that benefits all users! 🌟