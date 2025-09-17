/**
 * Academic Project Templates for ADHD-Friendly Project Initiation
 * 
 * These templates provide structured, ADHD-friendly project breakdowns for common
 * academic work types. Each template includes micro-tasks, timelines, and checkpoints.
 */

import { MicroTask } from './task-service';

export interface AcademicTemplate {
	id: string;
	name: string;
	description: string;
	category: 'dissertation' | 'paper' | 'proposal' | 'chapter' | 'presentation' | 'review';
	estimatedWeeks: number;
	phases: AcademicPhase[];
	adhdTips: string[];
	energyProfile: 'low' | 'moderate' | 'high'; // Energy typically required
}

export interface AcademicPhase {
	name: string;
	description: string;
	estimatedDays: number;
	tasks: AcademicTask[];
	checkpoints: string[];
}

export interface AcademicTask {
	title: string;
	description: string;
	estimatedMinutes: number;
	energyLevel: 'low' | 'moderate' | 'high';
	adhdFriendly: boolean;
	dependencies?: string[]; // Other task titles this depends on
	tips?: string[];
}

/**
 * Collection of ADHD-optimized academic project templates
 */
export class AcademicTemplateService {
	
	/**
	 * Get all available templates
	 */
	getTemplates(): AcademicTemplate[] {
		return [
			this.getDissertationTemplate(),
			this.getResearchPaperTemplate(),
			this.getDissertationProposalTemplate(),
			this.getChapterTemplate(),
			this.getPresentationTemplate(),
			this.getLiteratureReviewTemplate(),
		];
	}

	/**
	 * Get template by ID
	 */
	getTemplate(id: string): AcademicTemplate | null {
		return this.getTemplates().find(t => t.id === id) || null;
	}

	/**
	 * Get templates by category
	 */
	getTemplatesByCategory(category: string): AcademicTemplate[] {
		return this.getTemplates().filter(t => t.category === category);
	}

	/**
	 * Convert template to micro-tasks for today's board
	 */
	templateToMicroTasks(template: AcademicTemplate, selectedPhases?: string[]): MicroTask[] {
		const tasks: MicroTask[] = [];
		let order = 0;

		for (const phase of template.phases) {
			// Skip if specific phases selected and this isn't one
			if (selectedPhases && !selectedPhases.includes(phase.name)) {
				continue;
			}

			// Take first 3-4 tasks from each phase to avoid overwhelm
			const phaseTasks = phase.tasks.slice(0, 4);
			
			for (const task of phaseTasks) {
				tasks.push({
					id: `template_${template.id}_${Date.now()}_${order}`,
					text: `${task.title} - ${task.description}`,
					status: 'todo',
					order: order++,
					created: Date.now(),
					updated: Date.now(),
					// Additional metadata for ADHD support
					estimatedMinutes: task.estimatedMinutes,
					energyLevel: task.energyLevel,
					phase: phase.name,
					templateId: template.id,
				} as MicroTask & { 
					estimatedMinutes: number;
					energyLevel: string;
					phase: string;
					templateId: string;
				});

				// Limit to 8 tasks total to avoid ADHD overwhelm
				if (tasks.length >= 8) break;
			}

			if (tasks.length >= 8) break;
		}

		return tasks;
	}

	/**
	 * Dissertation Template - Full dissertation project
	 */
	private getDissertationTemplate(): AcademicTemplate {
		return {
			id: 'dissertation-full',
			name: 'Complete Dissertation',
			description: 'Full dissertation project from proposal to defense, broken into ADHD-friendly phases',
			category: 'dissertation',
			estimatedWeeks: 104, // ~2 years
			energyProfile: 'high',
			adhdTips: [
				'Work in 25-minute sprints with 5-minute breaks',
				'Set daily micro-goals instead of thinking about the whole project',
				'Create a visual progress tracker',
				'Schedule writing during your peak energy hours',
				'Use body doubling - work alongside others virtually or in person',
			],
			phases: [
				{
					name: 'Foundation & Planning',
					description: 'Establish research framework and detailed plan',
					estimatedDays: 14,
					checkpoints: [
						'Research question clearly defined',
						'Literature search strategy completed',
						'Chapter outline approved by advisor'
					],
					tasks: [
						{
							title: 'Define core research question',
							description: 'Write 1-2 sentences stating your main research question',
							estimatedMinutes: 30,
							energyLevel: 'moderate',
							adhdFriendly: true,
							tips: ['Use the "So what?" test - why does this matter?']
						},
						{
							title: 'Create chapter outline',
							description: 'Draft high-level structure with 3-5 main chapters',
							estimatedMinutes: 45,
							energyLevel: 'high',
							adhdFriendly: true,
						},
						{
							title: 'Set up research folder system',
							description: 'Organize digital folders for sources, notes, drafts',
							estimatedMinutes: 20,
							energyLevel: 'low',
							adhdFriendly: true,
						},
						{
							title: 'Schedule advisor meeting',
							description: 'Book first planning meeting to discuss timeline',
							estimatedMinutes: 10,
							energyLevel: 'low',
							adhdFriendly: true,
						}
					]
				},
				{
					name: 'Literature Review',
					description: 'Comprehensive review of existing research',
					estimatedDays: 28,
					checkpoints: [
						'50+ relevant sources identified',
						'Literature synthesis complete',
						'Research gap clearly articulated'
					],
					tasks: [
						{
							title: 'Search academic databases',
							description: 'Find 10 highly relevant papers using keywords',
							estimatedMinutes: 60,
							energyLevel: 'moderate',
							adhdFriendly: false,
							tips: ['Set a timer to avoid falling down research rabbit holes']
						},
						{
							title: 'Read and annotate 3 papers',
							description: 'Deep read with highlights and margin notes',
							estimatedMinutes: 90,
							energyLevel: 'high',
							adhdFriendly: false,
						},
						{
							title: 'Write literature summary paragraph',
							description: 'Synthesize main themes from today\'s reading',
							estimatedMinutes: 25,
							energyLevel: 'moderate',
							adhdFriendly: true,
						},
						{
							title: 'Update reference manager',
							description: 'Add new sources to Zotero/Mendeley with tags',
							estimatedMinutes: 15,
							energyLevel: 'low',
							adhdFriendly: true,
						}
					]
				},
				{
					name: 'Methodology Design',
					description: 'Design research methods and data collection approach',
					estimatedDays: 21,
					checkpoints: [
						'Research design finalized',
						'Ethics approval obtained (if needed)',
						'Data collection tools ready'
					],
					tasks: [
						{
							title: 'Choose research methodology',
							description: 'Decide between qualitative, quantitative, or mixed methods',
							estimatedMinutes: 45,
							energyLevel: 'high',
							adhdFriendly: true,
						},
						{
							title: 'Draft data collection plan',
							description: 'Outline how you\'ll gather and analyze data',
							estimatedMinutes: 60,
							energyLevel: 'high',
							adhdFriendly: false,
						},
						{
							title: 'Create interview questions',
							description: 'Write 8-12 open-ended research questions',
							estimatedMinutes: 30,
							energyLevel: 'moderate',
							adhdFriendly: true,
						}
					]
				}
			]
		};
	}

	/**
	 * Research Paper Template - Journal article or conference paper
	 */
	private getResearchPaperTemplate(): AcademicTemplate {
		return {
			id: 'research-paper',
			name: 'Research Paper',
			description: 'Journal article or conference paper (15-30 pages)',
			category: 'paper',
			estimatedWeeks: 8,
			energyProfile: 'moderate',
			adhdTips: [
				'Write the abstract last, not first',
				'Start with figures/tables - they tell your story visually',
				'Use the "hourglass" structure: broad → specific → broad',
				'Write terrible first drafts - editing is easier than creating',
			],
			phases: [
				{
					name: 'Planning & Outline',
					description: 'Structure your argument and gather materials',
					estimatedDays: 7,
					checkpoints: [
						'Paper outline complete',
						'Key sources identified',
						'Main argument clearly stated'
					],
					tasks: [
						{
							title: 'Write one-sentence paper summary',
							description: 'What is the main point you want to make?',
							estimatedMinutes: 15,
							energyLevel: 'moderate',
							adhdFriendly: true,
						},
						{
							title: 'Create section headings',
							description: 'Draft Introduction, Methods, Results, Discussion',
							estimatedMinutes: 20,
							energyLevel: 'low',
							adhdFriendly: true,
						},
						{
							title: 'Gather 15-20 key sources',
							description: 'Find most relevant papers for your argument',
							estimatedMinutes: 60,
							energyLevel: 'moderate',
							adhdFriendly: false,
						}
					]
				}
			]
		};
	}

	/**
	 * Dissertation Proposal Template
	 */
	private getDissertationProposalTemplate(): AcademicTemplate {
		return {
			id: 'dissertation-proposal',
			name: 'Dissertation Proposal',
			description: 'Comprehensive proposal document (30-50 pages)',
			category: 'proposal',
			estimatedWeeks: 12,
			energyProfile: 'high',
			adhdTips: [
				'Think of it as a detailed plan, not a contract',
				'Focus on feasibility over perfection',
				'Get feedback early and often',
			],
			phases: [
				{
					name: 'Problem Definition',
					description: 'Clearly articulate the research problem',
					estimatedDays: 10,
					checkpoints: [
						'Research question finalized',
						'Significance statement written',
						'Advisor approval on direction'
					],
					tasks: [
						{
							title: 'Write problem statement',
							description: 'One paragraph explaining what you\'re studying',
							estimatedMinutes: 30,
							energyLevel: 'high',
							adhdFriendly: true,
						},
						{
							title: 'Draft research questions',
							description: 'List 3-5 specific questions you\'ll answer',
							estimatedMinutes: 25,
							energyLevel: 'moderate',
							adhdFriendly: true,
						}
					]
				}
			]
		};
	}

	/**
	 * Single Chapter Template
	 */
	private getChapterTemplate(): AcademicTemplate {
		return {
			id: 'dissertation-chapter',
			name: 'Dissertation Chapter',
			description: 'Single chapter (20-40 pages) with full development',
			category: 'chapter',
			estimatedWeeks: 6,
			energyProfile: 'moderate',
			adhdTips: [
				'Start each writing session by reading the last paragraph you wrote',
				'Write section headings before content',
				'Aim for 1-2 pages per day maximum',
			],
			phases: [
				{
					name: 'Chapter Planning',
					description: 'Structure and outline the chapter',
					estimatedDays: 3,
					checkpoints: [
						'Detailed outline completed',
						'Key sources identified',
						'Connection to overall thesis clear'
					],
					tasks: [
						{
							title: 'Write chapter thesis statement',
							description: 'What is this chapter\'s main argument?',
							estimatedMinutes: 20,
							energyLevel: 'moderate',
							adhdFriendly: true,
						},
						{
							title: 'Create section outline',
							description: 'Plan 4-6 main sections with 2-3 subsections each',
							estimatedMinutes: 45,
							energyLevel: 'high',
							adhdFriendly: true,
						}
					]
				}
			]
		};
	}

	/**
	 * Presentation Template
	 */
	private getPresentationTemplate(): AcademicTemplate {
		return {
			id: 'academic-presentation',
			name: 'Academic Presentation',
			description: 'Conference presentation or defense (20-60 minutes)',
			category: 'presentation',
			estimatedWeeks: 3,
			energyProfile: 'moderate',
			adhdTips: [
				'Practice out loud, not just in your head',
				'Use the rule of 3: tell them what you\'ll tell them, tell them, tell them what you told them',
				'Prepare for the worst-case scenario (tech failures)',
			],
			phases: [
				{
					name: 'Content Development',
					description: 'Create presentation content and slides',
					estimatedDays: 7,
					checkpoints: [
						'Key points identified',
						'Slide deck 90% complete',
						'Timing roughly mapped out'
					],
					tasks: [
						{
							title: 'Identify 3 main points',
							description: 'What are the 3 key takeaways for your audience?',
							estimatedMinutes: 15,
							energyLevel: 'moderate',
							adhdFriendly: true,
						},
						{
							title: 'Create title slide',
							description: 'Design opening slide with key info',
							estimatedMinutes: 20,
							energyLevel: 'low',
							adhdFriendly: true,
						}
					]
				}
			]
		};
	}

	/**
	 * Literature Review Template
	 */
	private getLiteratureReviewTemplate(): AcademicTemplate {
		return {
			id: 'literature-review',
			name: 'Literature Review',
			description: 'Systematic review of existing research (10-25 pages)',
			category: 'review',
			estimatedWeeks: 4,
			energyProfile: 'moderate',
			adhdTips: [
				'Use a matrix to track themes across papers',
				'Read abstracts first, then conclusions, then methods',
				'Take notes in your own words to avoid plagiarism',
			],
			phases: [
				{
					name: 'Search & Collection',
					description: 'Systematic literature search and initial screening',
					estimatedDays: 7,
					checkpoints: [
						'Search strategy documented',
						'Initial papers collected',
						'Inclusion/exclusion criteria set'
					],
					tasks: [
						{
							title: 'Define search keywords',
							description: 'List 8-12 terms for database searches',
							estimatedMinutes: 25,
							energyLevel: 'moderate',
							adhdFriendly: true,
						},
						{
							title: 'Search 3 databases',
							description: 'Run systematic searches in major academic databases',
							estimatedMinutes: 45,
							energyLevel: 'moderate',
							adhdFriendly: false,
						}
					]
				}
			]
		};
	}
}