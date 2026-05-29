import { Series, Audio as RemotionAudio } from 'remotion';
import { DoubtSlide } from './Slide';
import { MathStep } from './MathStep';

export const DoubtVideo = ({ 
    type = 'concept',
    scenes 
}: { 
    type?: 'concept' | 'math';
    scenes: { 
        title?: string; 
        text?: string; 
        equation?: string;
        duration: number; 
        audioUrl?: string 
    }[] 
}) => {
    return (
        <Series>
            {scenes.map((scene, i) => (
                <Series.Sequence key={i} durationInFrames={Math.max(30, (scene.duration || 5) * 30)}>
                    {type === 'math' ? (
                        <MathStep equation={scene.equation || ''} index={i} />
                    ) : (
                        <DoubtSlide title={scene.title || ''} text={scene.text || ''} index={i} audioUrl={scene.audioUrl} />
                    )}
                    {scene.audioUrl && <RemotionAudio src={scene.audioUrl} />}
                </Series.Sequence>
            ))}
        </Series>
    );
};
