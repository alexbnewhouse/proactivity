import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, Modal } from 'obsidian';

interface DissertationSupportSettings {
	reminderInterval: number; // minutes
	openaiApiKey: string;
	dissertationTopic: string;
	deadline: string;
	lastReminderTime: number;
	isReminderActive: boolean;
}

const DEFAULT_SETTINGS: DissertationSupportSettings = {
	reminderInterval: 60, // 1 hour
	openaiApiKey: '',
	dissertationTopic: '',
	deadline: '',
	lastReminderTime: 0,
	isReminderActive: true
}

export default class DissertationSupportPlugin extends Plugin {
	settings: DissertationSupportSettings;
	reminderInterval: NodeJS.Timeout | null = null;

	async onload() {
		await this.loadSettings();

		// Add ribbon icon
		this.addRibbonIcon('brain', 'Dissertation Support', () => {
			this.showQuickStart();
		});

		// Add command for AI planning
		this.addCommand({
			id: 'ai-plan-dissertation',
			name: 'Plan my dissertation with AI',
			callback: () => {
				this.runAIPlanning();
			}
		});

		// Add command to toggle reminders
		this.addCommand({
			id: 'toggle-reminders',
			name: 'Toggle proactive reminders',
			callback: () => {
				this.toggleReminders();
			}
		});

		// Add settings tab
		this.addSettingTab(new DissertationSettingTab(this.app, this));

		// Start proactive reminders
		this.startProactiveReminders();

		console.log('Dissertation Support Plugin loaded');
	}

	onunload() {
		this.stopProactiveReminders();
		console.log('Dissertation Support Plugin unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	startProactiveReminders() {
		if (!this.settings.isReminderActive) return;
		
		this.stopProactiveReminders(); // Clear any existing interval
		
		this.reminderInterval = setInterval(() => {
			this.showProactiveReminder();
		}, this.settings.reminderInterval * 60 * 1000);

		console.log(`Proactive reminders started: every ${this.settings.reminderInterval} minutes`);
	}

	stopProactiveReminders() {
		if (this.reminderInterval) {
			clearInterval(this.reminderInterval);
			this.reminderInterval = null;
		}
	}

	toggleReminders() {
		this.settings.isReminderActive = !this.settings.isReminderActive;
		this.saveSettings();
		
		if (this.settings.isReminderActive) {
			this.startProactiveReminders();
			new Notice('✅ Proactive reminders enabled');
		} else {
			this.stopProactiveReminders();
			new Notice('⏸️ Proactive reminders paused');
		}
	}

	showProactiveReminder() {
		const now = Date.now();
		
		// Don't show if we just showed one recently (within 10 minutes)
		if (now - this.settings.lastReminderTime < 10 * 60 * 1000) {
			return;
		}

		this.settings.lastReminderTime = now;
		this.saveSettings();

		// Create a gentle, non-intrusive reminder
		const reminderMessages = [
			"🎓 Ready for 15 minutes of dissertation work?",
			"✍️ How about opening your dissertation document?",
			"📚 Time for a quick writing session?",
			"🔍 Want to review what you wrote yesterday?",
			"💭 Ready to add just one paragraph?",
			"📝 How about outlining your next section?",
		];

		const message = reminderMessages[Math.floor(Math.random() * reminderMessages.length)];
		
		new Notice(message, 8000); // Show for 8 seconds
		
		// Also log to console for debugging
		console.log('Proactive reminder shown:', message);
	}

	showQuickStart() {
		const modal = new QuickStartModal(this.app, this);
		modal.open();
	}

	async runAIPlanning() {
		if (!this.settings.openaiApiKey) {
			new Notice('❌ Please set your OpenAI API key in settings first');
			return;
		}

		if (!this.settings.dissertationTopic) {
			new Notice('❌ Please set your dissertation topic in settings first');
			return;
		}

		new Notice('🤖 Generating dissertation plan with AI...');

		try {
			const plan = await this.generateDissertationPlan();
			await this.createPlanFile(plan);
			new Notice('✅ Dissertation plan created! Check your vault for the new files.');
		} catch (error) {
			console.error('AI Planning error:', error);
			new Notice('❌ Failed to generate plan. Check your API key and try again.');
		}
	}

	async generateDissertationPlan(): Promise<string> {
		const prompt = `I'm working on a dissertation about "${this.settings.dissertationTopic}" with a deadline of ${this.settings.deadline || 'not specified'}. 

I have ADHD and struggle with:
- Task initiation (starting work)
- Breaking large projects into manageable pieces  
- Maintaining focus on abstract academic work
- Remembering what I was working on when I stopped

Please create a structured dissertation plan with:
1. Major chapters/sections breakdown
2. Specific, concrete micro-tasks for each section (not vague goals)
3. Realistic timeline suggestions
4. Daily action items that are small enough to start easily
5. Context preservation notes for each section

Format as markdown with clear headings and actionable tasks.`;

		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${this.settings.openaiApiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'gpt-4',
				messages: [
					{
						role: 'system',
						content: 'You are an expert academic advisor specializing in helping ADHD students complete dissertations. Focus on breaking down complex academic work into specific, actionable micro-tasks.'
					},
					{
						role: 'user',
						content: prompt
					}
				],
				max_tokens: 2000,
				temperature: 0.7
			})
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status}`);
		}

		const data = await response.json();
		return data.choices[0].message.content;
	}

	async createPlanFile(plan: string) {
		const today = new Date().toISOString().split('T')[0];
		const fileName = `Dissertation Plan - ${today}.md`;
		
		const frontmatter = `---
created: ${today}
topic: "${this.settings.dissertationTopic}"
deadline: "${this.settings.deadline}"
type: dissertation-plan
---

# Dissertation Plan: ${this.settings.dissertationTopic}

Generated on: ${today}
Deadline: ${this.settings.deadline || 'Not specified'}

${plan}

---

*This plan was generated by AI to help with ADHD-friendly dissertation management. Adjust as needed based on your progress and changing requirements.*
`;

		await this.app.vault.create(fileName, frontmatter);
	}
}

class QuickStartModal extends Modal {
	plugin: DissertationSupportPlugin;

	constructor(app: App, plugin: DissertationSupportPlugin) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: '🎓 Dissertation Support' });
		
		contentEl.createEl('p', { 
			text: 'This plugin provides proactive reminders and AI-powered planning for ADHD-friendly dissertation writing.' 
		});

		const quickActions = contentEl.createDiv('quick-actions');
		
		const planButton = quickActions.createEl('button', { 
			text: '🤖 Plan my dissertation with AI',
			cls: 'mod-cta'
		});
		planButton.onclick = () => {
			this.close();
			this.plugin.runAIPlanning();
		};

		const settingsButton = quickActions.createEl('button', { 
			text: '⚙️ Open Settings' 
		});
		settingsButton.onclick = () => {
			this.close();
			// @ts-ignore
			this.app.setting.open();
			// @ts-ignore  
			this.app.setting.openTabById(this.plugin.manifest.id);
		};

		const reminderButton = quickActions.createEl('button', { 
			text: this.plugin.settings.isReminderActive ? '⏸️ Pause Reminders' : '▶️ Start Reminders'
		});
		reminderButton.onclick = () => {
			this.plugin.toggleReminders();
			this.close();
		};
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class DissertationSettingTab extends PluginSettingTab {
	plugin: DissertationSupportPlugin;

	constructor(app: App, plugin: DissertationSupportPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Dissertation Support Settings' });

		new Setting(containerEl)
			.setName('Reminder interval')
			.setDesc('How often to show proactive reminders (in minutes)')
			.addText(text => text
				.setPlaceholder('60')
				.setValue(this.plugin.settings.reminderInterval.toString())
				.onChange(async (value) => {
					const num = parseInt(value);
					if (!isNaN(num) && num > 0) {
						this.plugin.settings.reminderInterval = num;
						await this.plugin.saveSettings();
						this.plugin.startProactiveReminders(); // Restart with new interval
					}
				}));

		new Setting(containerEl)
			.setName('OpenAI API Key')
			.setDesc('Your OpenAI API key for AI-powered dissertation planning')
			.addText(text => text
				.setPlaceholder('sk-...')
				.setValue(this.plugin.settings.openaiApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openaiApiKey = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Dissertation Topic')
			.setDesc('What is your dissertation about? (for AI planning)')
			.addTextArea(text => text
				.setPlaceholder('e.g., "The impact of climate change on coastal ecosystems"')
				.setValue(this.plugin.settings.dissertationTopic)
				.onChange(async (value) => {
					this.plugin.settings.dissertationTopic = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Deadline')
			.setDesc('When is your dissertation due?')
			.addText(text => text
				.setPlaceholder('e.g., "May 2025" or "2025-05-15"')
				.setValue(this.plugin.settings.deadline)
				.onChange(async (value) => {
					this.plugin.settings.deadline = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Proactive Reminders')
			.setDesc('Enable proactive reminders to work on your dissertation')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.isReminderActive)
				.onChange(async (value) => {
					this.plugin.settings.isReminderActive = value;
					await this.plugin.saveSettings();
					
					if (value) {
						this.plugin.startProactiveReminders();
					} else {
						this.plugin.stopProactiveReminders();
					}
				}));
	}
}