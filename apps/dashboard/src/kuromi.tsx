import { useEffect, useState } from "react"
import kuromiFrames from "./assets/kuromi-frames.json"

export function Kuromi() {
	const [frameIndex, setFrameIndex] = useState(0)

	useEffect(() => {
		const interval = setInterval(() => {
			setFrameIndex((prev) => (prev + 1) % kuromiFrames.length)
		}, 300)

		return () => clearInterval(interval)
	}, [])

	const currentFrame = kuromiFrames[frameIndex]

	return (
		<pre className="leading-none select-none font-mono text-black dark:text-neutral-100 scale-[5%]">
			{currentFrame.map((line, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: frame lines don't have unique identifiers
				<div key={index}>{line}</div>
			))}
		</pre>
	)
}
