# Contributing

Thank you for your interest in improving Dissertation Support! This plugin is built by and for the ADHD community.

## Getting Started

1. **Fork the repository**
2. **Clone your fork**
   ```bash
   git clone https://github.com/your-username/proactivity.git
   cd proactivity
   ```

3. **Set up development environment**
   ```bash
   cd dissertation-support
   npm install
   npm run dev  # Starts development build with watch mode
   ```

4. **Install in Obsidian for testing**
   - Create a symlink to your development folder:
   ```bash
   ln -sf $(pwd) /path/to/your/vault/.obsidian/plugins/dissertation-support
   ```
   - Restart Obsidian and enable the plugin

## Project Structure

```
dissertation-support/
├── main.ts           # Main plugin code
├── manifest.json     # Plugin metadata
├── package.json      # Dependencies and scripts
├── tsconfig.json     # TypeScript configuration
├── esbuild.config.mjs # Build configuration
└── README.md         # Plugin documentation
```

## Development Workflow

1. **Make your changes** to `main.ts`
2. **Build automatically** (if running `npm run dev`)
3. **Reload the plugin** in Obsidian (Ctrl+R or restart)
4. **Test your changes**

## What We Need Help With

### 🐛 Bug Reports
- **Clear steps to reproduce**
- **Expected vs actual behavior**
- **Obsidian version and operating system**
- **Error messages from the console** (Ctrl+Shift+I)

### 💡 Feature Ideas
Before submitting feature requests, consider:
- **Does this solve a specific ADHD challenge?**
- **Would this add complexity that might hurt usability?**
- **Is this aligned with the "minimal, proactive" philosophy?**

### 🧠 ADHD-Specific Improvements
We especially welcome contributions from people with ADHD who understand:
- **Executive function challenges**
- **Task initiation difficulties**
- **Attention and focus patterns**
- **Overwhelm and decision paralysis**

### 📝 Areas for Contribution

#### Core Features
- **Better reminder messages** - More effective, gentle nudges
- **Improved AI prompting** - Better task breakdown for ADHD minds
- **Context preservation** - Remember where you left off
- **Integration improvements** - Better Obsidian workflow integration

#### Code Quality
- **Type safety** - Better TypeScript types
- **Error handling** - Graceful failure modes
- **Performance** - Faster load times, less memory usage
- **Accessibility** - Screen reader support, keyboard navigation

#### Documentation
- **User guides** - How to use effectively with ADHD
- **Example workflows** - Real dissertation writing patterns
- **Troubleshooting** - Common issues and solutions
- **Academic writing tips** - ADHD-friendly research strategies

## Pull Request Guidelines

1. **Keep it focused** - One feature or fix per PR
2. **Test thoroughly** - Make sure it works in real Obsidian usage
3. **Follow existing patterns** - Match the current code style
4. **Update documentation** - If you change behavior, update README
5. **Consider ADHD impact** - Will this help or hurt people with executive function challenges?

### Good PR Examples
- "Fix reminder notifications not showing on macOS"
- "Add 'take a break' reminder after 90 minutes of work"
- "Improve AI prompt for literature review tasks"

### Avoid These
- "Add 15 new configuration options"
- "Completely rewrite the UI with complex dashboard"
- "Add social sharing and gamification features"

## Code Style

- **Simple and readable** - ADHD developers will be reading this too
- **Minimal abstractions** - Avoid complex inheritance or patterns
- **Clear naming** - Functions and variables should be obvious
- **Helpful comments** - Explain the "why", not just the "what"

```typescript
// Good: Clear, specific, explains why
async function showGentleReminder() {
  // Only show reminder if enough time has passed to avoid spam
  if (now - this.lastReminderTime < 10 * 60 * 1000) {
    return;
  }
  // ... rest of function
}

// Avoid: Generic, unclear purpose
async function processReminder() {
  // ... complex logic with no explanation
}
```

## Testing

Manual testing checklist:
- [ ] Plugin loads without errors
- [ ] Settings can be configured
- [ ] Reminders appear at correct intervals
- [ ] AI planning works with valid API key
- [ ] Plugin can be disabled/enabled
- [ ] No conflicts with other plugins

## Questions?

- **Open a discussion** for general questions
- **Open an issue** for bugs or specific feature requests
- **Check existing issues** before creating new ones

## Code of Conduct

- **Be patient and kind** - Many contributors have ADHD and may need extra processing time
- **Assume good intentions** - We're all trying to help each other succeed
- **Focus on solutions** - Instead of just identifying problems, suggest improvements
- **Share your experience** - Your ADHD perspective is valuable, even if you're not a developer

## Recognition

Contributors will be:
- **Listed in the credits** (if you want to be)
- **Thanked in release notes** for significant contributions
- **Given collaborator access** for ongoing contributors

---

**Thank you for helping make dissertation writing more accessible for ADHD minds! 🧠❤️**