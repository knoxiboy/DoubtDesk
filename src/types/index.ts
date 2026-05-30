// Roadmap Types
export interface Milestone {
    week: string;
    goal: string;
    topics: string[];
    resources: string[];
    detailedSteps: string[];
}

export interface RoadmapResult {
    id?: number;
    title: string;
    description: string;
    milestones: Milestone[];
    tips: string[];
    createdAt?: string;
    targetField?: string;
}

export interface RoadmapItem {
    id: number;
    targetField: string;
    createdAt: string;
    roadmapData: RoadmapResult;
}

// Resume Analysis Types
export interface AnalysisResult {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    improvementPoints: string[];
    missingKeywords: string[];
    sectionwiseAnalysis?: Record<string, string>;
    scoreBreakdown?: {
        skills: number;
        projects: number;
        experience: number;
        ats: number;
        impact: number;
        industryFit: number;
    };

}

export interface ResumeAnalysisItem {
    id: number;
    resumeText: string;
    jobDescription: string | null;
    analysisData: AnalysisResult;
    resumeName: string | null;
    createdAt: string;
}

// Cover Letter Types
export interface CoverLetterItem {
    id: number;
    jobDescription: string;
    userDetails: string;
    coverLetter: string;
    createdAt: string;
}

// Chat Types
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

export interface ChatItem {
    chatId: string;
    chatTitle: string;
    createdAt: string;
}

// Resume Builder Types
export interface PersonalInfo {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    linkedin?: string;
    github?: string;
    leetcode?: string;
    portfolio?: string;
    summary: string;
}

export interface Education {
    institution: string;
    degree: string;
    location: string;
    startDate: string;
    endDate: string;
    cgpa?: string;
    description?: string;
}

export interface Experience {
    company: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string;
    description: string;
}

export interface Skill {
    category: string;
    skills: string[];
}

export interface Project {
    title: string;
    link?: string;
    description: string;
    technologies: string[];
}

export interface CustomSubItem {
    title?: string;
    subtitle?: string;
    date?: string;
    location?: string;
    description: string;
}

export interface CustomSection {
    id: string;
    title: string;
    items: CustomSubItem[];
}

export interface ResumeData {
    personalInfo: PersonalInfo;
    education: Education[];
    experience: Experience[];
    skills: Skill[];
    projects: Project[];
    honors?: string[];
    customSections?: CustomSection[];
    template: string;
}

export interface ResumeItem {
    id: number;
    userEmail: string;
    resumeName: string;
    resumeData: ResumeData;
    createdAt: string;
    updatedAt: string;
}
