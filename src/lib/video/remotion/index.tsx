import { registerRoot, Composition } from 'remotion';
import { DoubtVideo } from './Composition';

interface Scene {
    duration?: number;
    [key: string]: unknown;
}

interface VideoProps {
    scenes: Scene[];
    [key: string]: unknown;
}

registerRoot(() => {
    return (
        <Composition
            id="DoubtVideo"
            component={DoubtVideo}
            durationInFrames={600} 
            fps={30}
            width={1920}
            height={1080}
            calculateMetadata={async ({ props }: { props: VideoProps }) => {
                const totalDuration = props.scenes.reduce((acc, scene) => acc + Math.max(30, (scene.duration || 5) * 30), 0);
                return {
                    durationInFrames: totalDuration,
                };
            }}
            defaultProps={{
                type: 'concept' as const,
                scenes: [
                    { title: "Introduction", text: "Welcome to your AI explanation.", duration: 5 }
                ]
            }}
        />
    );
});
