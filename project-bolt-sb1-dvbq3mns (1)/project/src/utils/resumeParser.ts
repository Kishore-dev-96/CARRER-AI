// Simple resume parser without external dependencies
export interface ParsedResume {
  skills: string[];
  experience: string;
  jobRoles: string[];
  education: string[];
  projects: string[];
}

export class ResumeParser {
  static async parseResumeText(text: string): Promise<ParsedResume> {
    try {
      return this.basicTextParsing(text);
    } catch (error) {
      console.error('Resume parsing error:', error);
      return this.basicTextParsing(text);
    }
  }

  private static basicTextParsing(text: string): ParsedResume {
    const lowerText = text.toLowerCase();
    
    // Common technical skills to look for
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'angular', 'vue',
      'html', 'css', 'sql', 'mongodb', 'postgresql', 'aws', 'docker',
      'kubernetes', 'git', 'typescript', 'c++', 'c#', 'php', 'ruby',
      'go', 'rust', 'swift', 'kotlin', 'flutter', 'react native',
      'express', 'django', 'flask', 'spring', 'laravel', 'rails',
      'machine learning', 'ai', 'data science', 'analytics', 'tableau',
      'power bi', 'excel', 'figma', 'photoshop', 'illustrator'
    ];

    const foundSkills = commonSkills.filter(skill => 
      lowerText.includes(skill.toLowerCase())
    );

    // Extract experience years
    const experiencePatterns = [
      /(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)/i,
      /(\d+)\+?\s*yrs?\s*(of\s*)?(experience|exp)/i,
      /experience[:\s]*(\d+)\+?\s*years?/i
    ];
    
    let experience = 'Entry level';
    for (const pattern of experiencePatterns) {
      const match = text.match(pattern);
      if (match) {
        experience = `${match[1]} years`;
        break;
      }
    }

    // Extract job roles
    const rolePatterns = [
      /\b(software|web|frontend|backend|full.?stack|mobile)\s+(developer|engineer)\b/gi,
      /\b(data|machine learning|ai|ml)\s+(scientist|engineer|analyst)\b/gi,
      /\b(product|project|program)\s+manager\b/gi,
      /\b(ui|ux|graphic)\s+designer\b/gi,
      /\b(devops|cloud|system)\s+engineer\b/gi,
      /\b(business|data|financial)\s+analyst\b/gi,
      /\b(technical|software)\s+(lead|architect)\b/gi,
      /\b(qa|quality assurance)\s+(engineer|tester)\b/gi
    ];

    const jobRoles: string[] = [];
    rolePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        jobRoles.push(...matches.map(match => match.trim()));
      }
    });

    // Extract education
    const educationPatterns = [
      /\b(bachelor|master|phd|doctorate|diploma|certificate)\b.*?\b(computer science|engineering|mathematics|business|design)\b/gi,
      /\b(b\.?tech|m\.?tech|b\.?sc|m\.?sc|mba|bba)\b/gi,
      /\b(university|college|institute)\b/gi
    ];

    const education: string[] = [];
    educationPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        education.push(...matches.slice(0, 3));
      }
    });

    // Extract projects
    const projectKeywords = ['project', 'built', 'developed', 'created', 'designed', 'implemented'];
    const projects: string[] = [];
    
    const sentences = text.split(/[.!?]+/);
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      if (projectKeywords.some(keyword => lowerSentence.includes(keyword))) {
        const trimmed = sentence.trim();
        if (trimmed.length > 20 && trimmed.length < 200) {
          projects.push(trimmed);
        }
      }
    });

    return {
      skills: [...new Set(foundSkills)],
      experience,
      jobRoles: [...new Set(jobRoles)],
      education: [...new Set(education)].slice(0, 3),
      projects: projects.slice(0, 5)
    };
  }

  static async generateResumeBasedQuestions(
    resume: ParsedResume,
    jobRole: string,
    count: number = 5
  ): Promise<string[]> {
    try {
      // Use the existing generateInterviewQuestions function
      const { generateInterviewQuestions } = await import('../utils/gemini');
      
      const jobDescription = `Interview for ${jobRole} position. 
        Candidate has skills: ${resume.skills.join(', ')} 
        Experience: ${resume.experience}
        Previous roles: ${resume.jobRoles.join(', ')}`;
      
      return await generateInterviewQuestions(
        jobRole,
        jobDescription,
        resume.experience.includes('Entry') ? 'Entry-level' : 'Mid-level',
        count
      );
    } catch (error) {
      console.error('Error generating resume-based questions:', error);
      return this.getFallbackQuestions(jobRole, resume);
    }
  }

  private static getFallbackQuestions(jobRole: string, resume: ParsedResume): string[] {
    const baseQuestions = [
      "Tell me about yourself and what interests you about this role.",
      "Walk me through your experience and how it relates to this position.",
      "What are your greatest strengths and how do they apply to this role?",
      "Describe a challenging project you've worked on and how you overcame obstacles.",
      "Where do you see yourself in the next few years?"
    ];

    // Add skill-specific questions if available
    if (resume.skills.length > 0) {
      baseQuestions.push(`I see you have experience with ${resume.skills.slice(0, 3).join(', ')}. Can you tell me about a project where you used these technologies?`);
    }

    if (resume.jobRoles.length > 0) {
      baseQuestions.push(`You've worked as a ${resume.jobRoles[0]}. How has that experience prepared you for this ${jobRole} role?`);
    }

    return baseQuestions;
  }
}