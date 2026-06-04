import React from 'react';
import { ResumeData } from "@/types";
import { Mail, Phone, MapPin, Linkedin, Github, Globe, Trophy, ExternalLink } from "lucide-react";

interface ResumePreviewProps {
    data: ResumeData;
}

const ResumePreview: React.FC<ResumePreviewProps> = ({ data }) => {
    const { personalInfo, education, experience, skills, projects, honors, customSections } = data;

    const cleanUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

    return (
        <div className="w-full h-full p-4 flex justify-center overflow-auto custom-scrollbar">
            <div className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl origin-top scale-[0.6] sm:scale-[0.7] md:scale-[0.8] lg:scale-[0.9] xl:scale-100 transition-transform p-[15mm] font-serif">
                {/* Header */}
                <header className="text-center mb-6 border-b-[2.5px] border-slate-950 pb-5 font-serif">
                    <h1 className="text-4xl font-black uppercase tracking-tight mb-5 text-slate-950">
                        {personalInfo.fullName || "Your Full Name"}
                    </h1>

                    <div className="flex justify-center items-center gap-3 text-[10px] text-slate-700">
                        {personalInfo.phone && (
                            <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 fill-slate-700" />
                                <span>{personalInfo.phone}</span>
                            </div>
                        )}
                        {personalInfo.phone && personalInfo.email && <span className="text-slate-800 dark:text-slate-200">|</span>}
                        {personalInfo.email && (
                            <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 fill-slate-700" />
                                <span>{personalInfo.email}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center items-center gap-3 text-[10px] text-slate-700 mt-1.5">
                        {personalInfo.linkedin && (
                            <div className="flex items-center gap-1.5">
                                <Linkedin className="w-3 h-3 fill-slate-700" />
                                <span className="hover:underline">{cleanUrl(personalInfo.linkedin)}</span>
                            </div>
                        )}
                        {personalInfo.linkedin && personalInfo.github && <span className="text-slate-800 dark:text-slate-200">|</span>}
                        {personalInfo.github && (
                            <div className="flex items-center gap-1.5">
                                <Github className="w-3 h-3 fill-slate-700" />
                                <span className="hover:underline">{cleanUrl(personalInfo.github)}</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Summary */}
                {personalInfo.summary && (
                    <section className="mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-widest mb-2 border-b-[1.5px] border-slate-900 pb-1 text-slate-900">Summary</h2>
                        <p className="text-[11px] leading-snug text-slate-700 whitespace-pre-wrap">
                            {personalInfo.summary}
                        </p>
                    </section>
                )}

                {/* Experience */}
                {experience.length > 0 && (
                    <section className="mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-widest mb-3 border-b-[1.5px] border-slate-900 pb-1 text-slate-900">Professional Experience</h2>
                        <div className="space-y-4">
                            {experience.map((exp, idx) => (
                                <div key={idx} className={`${idx > 0 ? "pt-3 border-t border-slate-100" : ""}`}>
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-[11px] font-bold text-slate-900">{exp.role || "Role"}</h3>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 italic">{exp.startDate} — {exp.endDate}</span>
                                    </div>
                                    <h4 className="text-[10px] font-semibold text-slate-700 italic mb-2">{exp.company || "Company"}</h4>
                                    <div className="space-y-1.5 pl-2">
                                        {exp.description.split('\n').filter(p => p.trim()).map((point, pIdx) => (
                                            <div key={pIdx} className="flex gap-2.5">
                                                <span className="text-[9px] mt-1.5 text-slate-600 dark:text-slate-400">•</span>
                                                <p className="text-[10px] leading-snug text-slate-700">
                                                    {point}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {projects.length > 0 && (
                    <section className="mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-widest mb-3 border-b-[1.5px] border-slate-900 pb-1 text-slate-900">Strategic Projects</h2>
                        <div className="space-y-4">
                            {projects.map((project, idx) => (
                                <div key={idx} className={`${idx > 0 ? "pt-3 border-t border-slate-100" : ""}`}>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <h3 className="text-[11px] font-bold text-slate-900 flex items-center gap-2">
                                            {project.title || "Untitled Project"}
                                            {project.link && <ExternalLink className="w-3 h-3 text-blue-500" />}
                                        </h3>
                                        {project.technologies && project.technologies.length > 0 && (
                                            <div className="flex gap-1.5">
                                                {project.technologies.map((tech, i) => (
                                                    <span key={i} className="text-[8px] px-2 py-0.5 bg-slate-50 text-slate-600 rounded-full font-bold uppercase tracking-tighter border border-slate-100">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5 pl-2">
                                        {project.description.split('\n').filter(p => p.trim()).map((point, pIdx) => (
                                            <div key={pIdx} className="flex gap-2.5">
                                                <span className="text-[9px] mt-1.5 text-slate-600 dark:text-slate-400">•</span>
                                                <p className="text-[10px] leading-snug text-slate-700">
                                                    {point}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Education */}
                {education.length > 0 && (
                    <section className="mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-widest mb-3 border-b-[1.5px] border-slate-900 pb-1 text-slate-900">Education</h2>
                        <div className="space-y-3">
                            {education.map((edu, idx) => (
                                <div key={idx} className="">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        <h3 className="text-[11px] font-bold text-slate-900">{edu.institution || "Institution"}</h3>
                                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 italic">{edu.startDate} — {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-medium text-slate-700 italic">{edu.degree}</span>
                                        {edu.cgpa && <span className="text-[9px] font-bold text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-200">GPA: {edu.cgpa}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Skills */}
                {skills.length > 0 && (
                    <section className="mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-widest mb-3 border-b-[1.5px] border-slate-900 pb-1 text-slate-900">Technical Skills</h2>
                        <div className="space-y-2.5">
                            {skills.map((skill, idx) => (
                                <div key={idx} className="flex items-start">
                                    <span className="text-[10px] font-bold text-slate-900 w-[45mm] flex-shrink-0">{skill.category}:</span>
                                    <span className="text-[10px] text-slate-700 leading-normal">{skill.skills.join(", ")}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Custom Sections */}
                {customSections && customSections.length > 0 && customSections.map((section, sIdx) => (
                    <section key={section.id || sIdx} className="mb-4">
                        <h2 className="text-[11px] font-black uppercase tracking-widest mb-3 border-b-[1.5px] border-slate-900 pb-1 text-slate-900">{section.title}</h2>
                        <div className="space-y-4">
                            {section.items.map((item, iIdx) => (
                                <div key={iIdx} className="">
                                    <div className="flex justify-between items-baseline mb-0.5">
                                        {item.title && <h3 className="text-[11px] font-bold text-slate-900">{item.title}</h3>}
                                        {item.date && <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 italic">{item.date}</span>}
                                    </div>
                                    {(item.subtitle || item.location) && (
                                        <div className="flex justify-between items-baseline mb-2">
                                            {item.subtitle && <span className="text-[10px] font-semibold text-slate-700 italic">{item.subtitle}</span>}
                                            {item.location && <span className="text-[10px] text-slate-500 dark:text-slate-500 font-medium">{item.location}</span>}
                                        </div>
                                    )}
                                    <div className="space-y-1.5 pl-2">
                                        {item.description.split('\n').filter(p => p.trim()).map((point, pIdx) => (
                                            <div key={pIdx} className="flex gap-2.5">
                                                <span className="text-[9px] mt-1.5 text-slate-600 dark:text-slate-400">•</span>
                                                <p className="text-[10px] leading-snug text-slate-700">
                                                    {point}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}

                {/* Honors */}
                {honors && honors.length > 0 && honors.some(h => h) && (
                    <section>
                        <h2 className="text-[11px] font-black uppercase tracking-widest mb-3 border-b-[1.5px] border-slate-900 pb-1 text-slate-900">Honors & Awards</h2>
                        <div className="space-y-2.5">
                            {honors.filter(h => h).map((honor, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <Trophy className="w-3.5 h-3.5 text-orange-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-[10px] text-slate-700 leading-snug">{honor}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

export default ResumePreview;
