import { AbsoluteFill, useVideoConfig, useCurrentFrame, interpolate, spring } from 'remotion';

export const DoubtSlide = ({ title, text, index, audioUrl }: { title: string; text: string; index: number; audioUrl?: string }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const opacity = interpolate(frame, [0, 10], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });

    const translateY = spring({
        frame,
        fps,
        from: 20,
        to: 0,
        config: { stiffness: 100 },
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
                opacity, 
                transform: `translateY(${translateY}px)`,
                textAlign: 'center'
            }}>
                <h1 style={{ 
                    color: '#3b82f6', 
                    fontSize: '60px', 
                    fontWeight: 'black',
                    textTransform: 'uppercase',
                    marginBottom: '40px'
                }}>{title}</h1>
                <p style={{ 
                    color: 'white', 
                    fontSize: '32px', 
                    lineHeight: '1.5',
                    maxWidth: '1000px'
                }}>{text}</p>
            </div>
            
            {/* Slide Indicator */}
            <div style={{
                position: 'absolute',
                bottom: '40px',
                right: '40px',
                color: '#1e293b',
                fontSize: '24px',
                fontWeight: 'bold'
            }}>
                Slide {index + 1}
            </div>
        </AbsoluteFill>
    );
};
