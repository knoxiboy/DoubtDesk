import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

export const MathStep = ({ equation, index }: { equation: string; index: number }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(frame, [0, 15], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const scale = spring({
        frame,
        fps,
        from: 0.8,
        to: 1,
        config: { stiffness: 60 },
    });

    return (
        <AbsoluteFill style={{ 
            backgroundColor: '#020617', 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '80px',
            fontFamily: 'sans-serif'
        }}>
            <div style={{
                position: 'absolute',
                top: '60px',
                left: '60px',
                color: '#3b82f6',
                fontSize: '32px',
                fontWeight: 'bold'
            }}>
                Step {index + 1}
            </div>

            <div style={{ 
                opacity, 
                transform: `scale(${scale})`,
                textAlign: 'center',
                color: 'white',
                fontSize: '80px'
            }}>
                <BlockMath math={equation} />
            </div>
            
            <div style={{
                position: 'absolute',
                bottom: '60px',
                color: '#475569',
                fontSize: '24px'
            }}>
                Mathematical Solution
            </div>
        </AbsoluteFill>
    );
};
