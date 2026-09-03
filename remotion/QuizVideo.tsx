import type React from "react";
import {
	AbsoluteFill,
	Audio,
	Img,
	Sequence,
	interpolate,
	spring,
	staticFile,
	useCurrentFrame,
	useVideoConfig,
} from "remotion";
import { z } from "zod";
import { Countdown } from "./Countdown/Countdown";
import { HeroLogo } from "./HeroLogo";
import { IntroText, introDuration } from "./IntroText"; // Import the new component and its duration

// Define schema for quiz data validation (Section 4)
export const quizCompSchema = z.object({
	quizData: z.object({
		questions: z.array(
			z.object({
				question: z.string(),
				options: z.array(z.string()),
				correctAnswerIndex: z.number().min(0).max(3), // Assuming max 4 options
			}),
		),
	}),
});

// Time constants (in frames)
const QUESTION_DURATION = 270; // Extended to 9 seconds (240 + 30 for slide out)
const REVEAL_AT = 195; // Countdown finishes at 6.5 seconds
const REVEAL_DELAY = 15; // Highlight answer 0.5 seconds after countdown hits 0
const COUNTDOWN_FADE_OUT_DURATION = 15; // Fade out '0' over 0.5 seconds
const SLIDE_OUT_DURATION = 30; // Slide out question/options over 1 second
const COUNTDOWN_FADE_IN_START = 40; // When countdown starts fading in
const COUNTDOWN_FADE_IN_DURATION = 15; // How long fade in takes

// --- New Theme Colors inspired by Image ---
const COLOR = {
	backgroundGradient: "linear-gradient(to bottom right, #9370db, #4169e1)", // Purple to Blue
	questionText: "#FFFFFF", // White
	optionBackground: "#FFFFFF", // White
	optionText: "#333333", // Dark Gray/Black for text on white
	correctHighlight: "#22c55e", // Keep existing green for correct highlight
	correctText: "#FFFFFF", // White text on correct highlight
	// Countdown colors are defined in its component, but should match this theme
};
// --- End Colors ---

const QuizQuestion: React.FC<{
	question: string;
	options: string[];
	correctAnswerIndex: number;
	questionIndex: number;
}> = ({ question, options, correctAnswerIndex, questionIndex }) => {
	const frame = useCurrentFrame();
	const { fps } = useVideoConfig();

	// Calculate offset based on current question
	const relativeFrame = frame; // useCurrentFrame is relative to Sequence

	// --- Adjusted highlight trigger ---
	const showCorrect = relativeFrame >= REVEAL_AT + REVEAL_DELAY;
	// --- End adjustment ---

	// Animation for question entry
	const questionEntryProgress = spring({
		frame: relativeFrame,
		fps,
		config: { damping: 100 },
		durationInFrames: 30, // Fade in over 1 second
	});

	// Animation for options entry (slightly delayed)
	const optionsEntryProgress = spring({
		frame: relativeFrame - 45, // Increased delay to 1.5 seconds (45 frames)
		fps,
		config: { damping: 100 },
		durationInFrames: 30,
	});

	// --- Slide Out Animation Logic ---
	const slideOutStartFrame = QUESTION_DURATION - SLIDE_OUT_DURATION;
	const slideOutProgress = interpolate(
		relativeFrame,
		[slideOutStartFrame, QUESTION_DURATION],
		[0, 1],
		{ extrapolateLeft: "clamp", extrapolateRight: "clamp" },
	);
	const contentTranslateY = interpolate(
		slideOutProgress,
		[0, 1],
		[0, -1200], // Slide upwards
	);
	const contentOpacity = interpolate(
		slideOutProgress,
		[0, 1],
		[1, 0], // Fade out during slide
	);
	// --- End Slide Out Animation Logic ---

	return (
		<AbsoluteFill
			style={{
				color: COLOR.questionText,
				fontFamily: "Arial, sans-serif",
				padding: 60,
				display: "flex",
			}}
		>
			{/* --- Countdown Audio --- */}
			<Audio
				src={staticFile("countdown.mp3")}
				startFrom={0}
				volume={0.3} // Adjust volume as needed
				// loop // Uncomment if the countdown sound is short and needs looping
			/>
			{/* --- End Countdown Audio --- */}

			{/* New Countdown Component Placement */}
			{/* Place the countdown within a Sequence to control its timing */}
			<Sequence from={0} durationInFrames={REVEAL_AT + 1}>
				<AbsoluteFill
					style={{
						// Position the countdown, adjust top/left/transform as needed
						top: '25%', 
						left: '50%',
						transform: 'translateX(-50%)', // Center horizontally
						display: 'flex',
						alignItems: 'flex-start', // Align to top of its container
						justifyContent: 'center',
						zIndex: 10, // Ensure it's above other elements
					}}
				>
					<Countdown durationInFrames={REVEAL_AT} />
				</AbsoluteFill>
			</Sequence>
			{/* End New Countdown Component */}

			{/* Main Content Container for Centering and Slide Out */}
			<div
				style={{
					position: "absolute",
					top: "35%",
					left: "50%",
					transform: `translate(-50%, -50%) translateY(${contentTranslateY}px)`,
					width: "100%",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					maxWidth: 700,
					opacity: contentOpacity,
				}}
			>
				<h1
					style={{
						fontSize: 60,
						textAlign: "center",
						marginBottom: 40,
						color: COLOR.questionText,
						opacity: questionEntryProgress,
					}}
				>
					{question}
				</h1>

				<div style={{ width: "100%" }}>
					{options.map((option, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: <Unique key generated combining question index and option index>
							key={`question-${questionIndex}-option-${i}`}
							style={{
								backgroundColor:
									showCorrect && i === correctAnswerIndex
										? COLOR.correctHighlight
										: COLOR.optionBackground,
								color:
									showCorrect && i === correctAnswerIndex
										? COLOR.correctText
										: COLOR.optionText,
								padding: "25px 30px",
								marginBottom: 25,
								borderRadius: 30,
								fontSize: 40,
								fontWeight:
									showCorrect && i === correctAnswerIndex ? "bold" : "normal",
								textAlign: "center",
								transform: `translateY(${interpolate(
									optionsEntryProgress,
									[0, 1],
									[20, 0],
								)}px) scale(${interpolate(
									optionsEntryProgress,
									[0, 1],
									[0.95, showCorrect && i === correctAnswerIndex ? 1.05 : 1],
								)})`,
								transition:
									"transform 0.3s ease-in-out, background-color 0.3s ease-in-out, color 0.3s ease-in-out",
								boxShadow:
									showCorrect && i === correctAnswerIndex
										? `0 0 15px ${COLOR.correctHighlight}`
										: "0 4px 6px rgba(0, 0, 0, 0.1)",
								opacity: optionsEntryProgress,
							}}
						>
							{option}
						</div>
					))}
				</div>
			</div>
		</AbsoluteFill>
	);
};

export const QuizVideo: React.FC<z.infer<typeof quizCompSchema>> = ({
	quizData,
}) => {
	const { questions } = quizData;

	return (
		<AbsoluteFill style={{ background: COLOR.backgroundGradient }}>
			<Img
				src={staticFile("mascot.png")}
				style={{
					position: "absolute",
					top: 40,
					right: 40,
					width: 150,
					zIndex: 20,
				}}
			/>
			{/* --- Play Intro Text and Avatar First --- */}
			<Sequence from={0} durationInFrames={introDuration}>
				{/* Add Intro Audio */}
				<Audio src={staticFile("intro.mp3")} />
				{/* Render Intro Text Component */}
				<IntroText text="Welcome to your Remotion template on Railway!" />
				{/* Render Hero Logo Component */}
				<HeroLogo />
			</Sequence>

			{/* --- Then Play Questions --- */}
			<Sequence from={introDuration}>
				{questions.map((q, i) => (
					<Sequence
						// biome-ignore lint/suspicious/noArrayIndexKey: <Unique key generated combining question index and option index>
						key={`question-${i}-${q.question.slice(0, 10)}`}
						from={i * QUESTION_DURATION}
						durationInFrames={QUESTION_DURATION}
					>
						<QuizQuestion
							question={q.question}
							options={q.options}
							correctAnswerIndex={q.correctAnswerIndex}
							questionIndex={i}
						/>
					</Sequence>
				))}
			</Sequence>
		</AbsoluteFill>
	);
};