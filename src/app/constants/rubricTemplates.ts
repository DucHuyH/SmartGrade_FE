

export const RUBRIC_TEMPLATES = [
    {
        id: 'engineering',
        name: 'Engineering Assessment (20% per criterion)',
        scoringLevels: [
            {
                level: 'Excellent',
                description: 'Identifies and solves highly complex engineering problems involving multiple stakeholders and conflicting requirements. Demonstrates strong use of algorithms, models, and engineering principles. Engineering design clearly demonstrates consideration of public health, cultural, societal, and environmental sustainability. Excellent presentation with clear documentation and effective communication.'
            },
            {
                level: 'Satisfactory',
                description: 'Solves moderately complex problems with appropriate use of fundamental engineering principles and technical methods. Mentions relevant design constraints. Shows reasonable communication with adequate documentation and collaboration.'
            },
            {
                level: 'Poor',
                description: 'Problem is too simple or routine, lacking scientific or engineering analysis. Design focuses only on technical implementation and ignores societal impacts. Poorly documented work with minimal communication or weak presentation.'
            }
        ],
        criteria: [
            {
                criteria_name: 'Complex Problem Analysis & Solution',
                description: `Excellent (8-10): Identifies and solves highly complex engineering problems involving multiple stakeholders, conflicting requirements, and integration of advanced technologies (e.g., AI, Cloud, IoT). Demonstrates strong use of algorithms, models, and engineering principles.

Satisfactory (5-7): Solves moderately complex problems with appropriate use of fundamental engineering principles and technical methods.

Poor (<5): Problem is too simple or routine, lacking scientific or engineering analysis. Does not demonstrate characteristics of complex engineering problems.`,
                max_score: 20,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Identifies and solves highly complex engineering problems involving multiple stakeholders, conflicting requirements, and integration of advanced technologies (e.g., AI, Cloud, IoT). Demonstrates strong use of algorithms, models, and engineering principles.' },
                    { level: 'Satisfactory', description: 'Solves moderately complex problems with appropriate use of fundamental engineering principles and technical methods.' },
                    { level: 'Poor', description: 'Problem is too simple or routine, lacking scientific or engineering analysis. Does not demonstrate characteristics of complex engineering problems.' }
                ]
            },
            {
                criteria_name: 'Engineering Design & Multiple Constraints',
                description: `Excellent (8-10): Engineering design clearly demonstrates consideration of public health & welfare, cultural, societal, and environmental sustainability (Green IT). Provides concrete technical design decisions addressing these constraints.

Satisfactory (5-7): Mentions relevant constraints but analysis remains basic and not fully integrated into system architecture or design decisions.

Poor (<5): Design focuses only on technical implementation and ignores societal, cultural, or environmental impacts.`,
                max_score: 20,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Engineering design clearly demonstrates consideration of public health & welfare, cultural, societal, and environmental sustainability (Green IT). Provides concrete technical design decisions addressing these constraints.' },
                    { level: 'Satisfactory', description: 'Mentions relevant constraints but analysis remains basic and not fully integrated into system architecture or design decisions.' },
                    { level: 'Poor', description: 'Design focuses only on technical implementation and ignores societal, cultural, or environmental impacts.' }
                ]
            },
            {
                criteria_name: 'Communication & Teamwork',
                description: `Excellent (8-10): Excellent presentation of work with clear documentation, diagrams, and effective written/verbal communication. Demonstrates strong collaboration and communication within the team.

Satisfactory (5-7): Good communication with adequate documentation. Shows reasonable collaboration but may lack depth in explanation.

Poor (<5): Poorly documented work with minimal communication or weak presentation. Little evidence of effective teamwork.`,
                max_score: 20,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Excellent presentation of work with clear documentation, diagrams, and effective written/verbal communication. Demonstrates strong collaboration and communication within the team.' },
                    { level: 'Satisfactory', description: 'Good communication with adequate documentation. Shows reasonable collaboration but may lack depth in explanation.' },
                    { level: 'Poor', description: 'Poorly documented work with minimal communication or weak presentation. Little evidence of effective teamwork.' }
                ]
            },
        ],
    },
    {
        id: 'academic',
        name: 'Academic Performance (Equal Weight)',
        scoringLevels: [
            {
                level: 'Excellent',
                description: 'Demonstrates deep understanding of core concepts and ability to apply them in complex scenarios. Employs creative and efficient problem-solving approaches with multiple solutions. Code is clean, well-structured, efficient, and maintainable. Comprehensive testing with edge cases identified and validated.'
            },
            {
                level: 'Satisfactory',
                description: 'Shows solid understanding of main concepts with ability to apply in standard scenarios. Solves problems using standard approaches with generally clear reasoning. Code is functional with reasonable structure. Adequate testing with main scenarios covered.'
            },
            {
                level: 'Poor',
                description: 'Limited understanding of core concepts with difficulty in application. Struggles to solve problems with unclear reasoning. Code lacks structure and contains bugs. Minimal or no testing performed.'
            }
        ],
        criteria: [
            {
                criteria_name: 'Understanding of Concepts',
                description: `Excellent (8-10): Demonstrates deep understanding of core concepts with ability to apply them in complex scenarios and explain underlying principles.

Satisfactory (5-7): Shows solid understanding of main concepts with ability to apply them in standard scenarios.

Poor (<5): Limited or incomplete understanding of core concepts. Difficulty in application.`,
                max_score: 25,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Demonstrates deep understanding of core concepts with ability to apply them in complex scenarios and explain underlying principles.' },
                    { level: 'Satisfactory', description: 'Shows solid understanding of main concepts with ability to apply them in standard scenarios.' },
                    { level: 'Poor', description: 'Limited or incomplete understanding of core concepts. Difficulty in application.' }
                ]
            },
            {
                criteria_name: 'Problem-Solving Skills',
                description: `Excellent (8-10): Employs creative and efficient problem-solving approaches; identifies multiple solutions and selects optimal one with clear justification.

Satisfactory (5-7): Solves problems using standard approaches; reasoning is generally clear but may miss alternative solutions.

Poor (<5): Struggles to solve problems; reasoning is unclear or incomplete.`,
                max_score: 25,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Employs creative and efficient problem-solving approaches; identifies multiple solutions and selects optimal one with clear justification.' },
                    { level: 'Satisfactory', description: 'Solves problems using standard approaches; reasoning is generally clear but may miss alternative solutions.' },
                    { level: 'Poor', description: 'Struggles to solve problems; reasoning is unclear or incomplete.' }
                ]
            },
            {
                criteria_name: 'Code Quality & Implementation',
                description: `Excellent (8-10): Code is clean, well-structured, efficient, and maintainable. Follows best practices and includes comprehensive comments/documentation.

Satisfactory (5-7): Code is functional with reasonable structure; may have minor efficiency issues or incomplete documentation.

Poor (<5): Code lacks structure, contains bugs, or is difficult to understand and maintain.`,
                max_score: 25,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Code is clean, well-structured, efficient, and maintainable. Follows best practices and includes comprehensive comments/documentation.' },
                    { level: 'Satisfactory', description: 'Code is functional with reasonable structure; may have minor efficiency issues or incomplete documentation.' },
                    { level: 'Poor', description: 'Code lacks structure, contains bugs, or is difficult to understand and maintain.' }
                ]
            },
            {
                criteria_name: 'Testing & Validation',
                description: `Excellent (8-10): Comprehensive test coverage with various test cases. Identifies edge cases and validates solution thoroughly.

Satisfactory (5-7): Adequate testing with main scenarios covered. Some edge cases may be missed.

Poor (<5): Minimal or no testing. Solution validation is incomplete or missing.`,
                max_score: 25,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Comprehensive test coverage with various test cases. Identifies edge cases and validates solution thoroughly.' },
                    { level: 'Satisfactory', description: 'Adequate testing with main scenarios covered. Some edge cases may be missed.' },
                    { level: 'Poor', description: 'Minimal or no testing. Solution validation is incomplete or missing.' }
                ]
            },
        ],
    },
    {
        id: 'project',
        name: 'Project Work (Research-Based)',
        scoringLevels: [
            {
                level: 'Excellent',
                description: 'Comprehensive review of relevant literature identifying gaps and synthesizing information effectively. Well-designed methodology appropriate for research questions. Clear presentation of results with thorough analysis and well-supported conclusions with meaningful recommendations.'
            },
            {
                level: 'Satisfactory',
                description: 'Adequate review of literature with reasonable coverage. Sound methodology but may lack some detail in justification. Results presented adequately with reasonable analysis. Reasonable conclusions with depth.'
            },
            {
                level: 'Poor',
                description: 'Limited literature review with weak synthesis. Unclear or insufficiently justified methodology. Results unclear or superficial analysis. Weak conclusions or missing recommendations.'
            }
        ],
        criteria: [
            {
                criteria_name: 'Research & Literature Review',
                description: `Excellent (8-10): Comprehensive review of relevant literature; identifies gaps and synthesizes information from multiple sources effectively.

Satisfactory (5-7): Adequate review of literature with reasonable coverage of relevant sources.

Poor (<5): Limited literature review or weak synthesis of sources.`,
                max_score: 20,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Comprehensive review of relevant literature; identifies gaps and synthesizes information from multiple sources effectively.' },
                    { level: 'Satisfactory', description: 'Adequate review of literature with reasonable coverage of relevant sources.' },
                    { level: 'Poor', description: 'Limited literature review or weak synthesis of sources.' }
                ]
            },
            {
                criteria_name: 'Methodology & Approach',
                description: `Excellent (8-10): Well-designed and justified methodology; appropriate for research questions with clear implementation plan.

Satisfactory (5-7): Sound methodology but may lack some detail in justification or implementation.

Poor (<5): Weak or unclear methodology; insufficient justification.`,
                max_score: 20,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Well-designed and justified methodology; appropriate for research questions with clear implementation plan.' },
                    { level: 'Satisfactory', description: 'Sound methodology but may lack some detail in justification or implementation.' },
                    { level: 'Poor', description: 'Weak or unclear methodology; insufficient justification.' }
                ]
            },
            {
                criteria_name: 'Results & Analysis',
                description: `Excellent (8-10): Clear presentation of results with thorough analysis; effectively interprets findings and discusses implications.

Satisfactory (5-7): Results are presented adequately with reasonable analysis.

Poor (<5): Results unclear or analysis is superficial.`,
                max_score: 30,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Clear presentation of results with thorough analysis; effectively interprets findings and discusses implications.' },
                    { level: 'Satisfactory', description: 'Results are presented adequately with reasonable analysis.' },
                    { level: 'Poor', description: 'Results unclear or analysis is superficial.' }
                ]
            },
            {
                criteria_name: 'Conclusions & Recommendations',
                description: `Excellent (8-10): Conclusions are well-supported by results; provides meaningful recommendations for future work.

Satisfactory (5-7): Reasonable conclusions; recommendations may lack depth.

Poor (<5): Weak conclusions or missing recommendations.`,
                max_score: 30,
                weight: 1,
                scoringLevels: [
                    { level: 'Excellent', description: 'Conclusions are well-supported by results; provides meaningful recommendations for future work.' },
                    { level: 'Satisfactory', description: 'Reasonable conclusions; recommendations may lack depth.' },
                    { level: 'Poor', description: 'Weak conclusions or missing recommendations.' }
                ]
            },
        ],
    },
    {
        id: 'custom',
        name: 'Custom Rubric',
        scoringLevels: [
            {
                level: 'Excellent',
                description: 'Demonstrates exceptional quality and proficiency in all aspects of the criterion.'
            },
            {
                level: 'Satisfactory',
                description: 'Meets the standard requirements with good quality and understanding of the criterion.'
            },
            {
                level: 'Poor',
                description: 'Does not fully meet the requirements or shows limited understanding of the criterion.'
            }
        ],
        criteria: [
            {
                criteria_name: 'Criteria 1',
                description: 'Add description for this criterion...',
                max_score: 20,
                weight: 1,
            },
            {
                criteria_name: 'Criteria 2',
                description: 'Add description for this criterion...',
                max_score: 20,
                weight: 1,
            },
        ],
    },
];

export const getRubricTemplate = (templateId: string) => {
    return RUBRIC_TEMPLATES.find((t) => t.id === templateId);
};
