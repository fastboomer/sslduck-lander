import { AbsoluteFill, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const HelloWorld: React.FC<{ titleText: string }> = ({ titleText }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const scale = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Sequence from={0}>
        <div
          style={{
            opacity,
            transform: `scale(${scale})`,
            fontSize: 80,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
            color: "white",
          }}
        >
          {titleText}
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
