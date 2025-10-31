import { ZIGBEE_DEVICE, type ZigbeeDeviceName, ZigbeeDeviceState, type ZigbeeDeviceStates } from "@eva/zigbee"
import { useDrag } from "@use-gesture/react"
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from "jotai"
import { CloudyIcon, LightbulbOffIcon, type LucideIcon, MoonStarIcon } from "lucide-react"
import { useEffect, useRef } from "react"
import cn from "./components/lib/cn"
import { Tile } from "./components/tile"

const LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT = 40

// Store brightness as step (0-43) to match the 44 bars exactly
// Step 0 = OFF, Steps 1-43 map to bars 42-0
export const brightnessStepAtoms = atom({
	[ZIGBEE_DEVICE.deskLamp]: atom(0),
	[ZIGBEE_DEVICE.livingRoomFloorLamp]: atom(0),
})

export const intermediateBrightnessStepAtoms = atom({
	[ZIGBEE_DEVICE.deskLamp]: atom(-1),
	[ZIGBEE_DEVICE.livingRoomFloorLamp]: atom(-1),
})

const sceneAtom = atom<string | null>(null)

const DEVICE_FRIENDLY_NAMES = {
	[ZIGBEE_DEVICE.deskLamp]: "Desk Lamp",
	[ZIGBEE_DEVICE.livingRoomFloorLamp]: "Floor Lamp",
} as const

export type LightSceneConfig = {
	id: string
	name: string
	icon: LucideIcon
	deviceStates: Partial<ZigbeeDeviceStates>
}

const DEFAULT_SCENES: Record<string, LightSceneConfig> = {
	"lights-off": {
		id: "lights-off",
		name: "Lights off",
		icon: LightbulbOffIcon,
		deviceStates: {
			[ZIGBEE_DEVICE.deskLamp]: {
				state: "OFF",
				brightness: 0,
			},
			[ZIGBEE_DEVICE.livingRoomFloorLamp]: {
				state: "OFF",
				brightness: 0,
			},
		},
	},
	evening: {
		id: "evening",
		name: "Evening",
		icon: MoonStarIcon,
		deviceStates: {
			[ZIGBEE_DEVICE.deskLamp]: {
				state: "ON",
				brightness: 127,
			},
			[ZIGBEE_DEVICE.livingRoomFloorLamp]: {
				state: "ON",
				brightness: 254,
			},
		},
	},
	gloomy: {
		id: "gloomy",
		name: "Gloomy",
		icon: CloudyIcon,
		deviceStates: {
			[ZIGBEE_DEVICE.deskLamp]: {
				state: "ON",
				brightness: 50,
			},
			[ZIGBEE_DEVICE.livingRoomFloorLamp]: {
				state: "ON",
				brightness: 128,
			},
		},
	},
} as const

// Convert brightness (0-254) to step (0-43)
// Step 0 = brightness 0, steps 1-43 map to brightness 1-254
export function brightnessToStep(brightness: number): number {
	if (brightness === 0) return 0
	// Map brightness 1-254 to steps 1-43
	return Math.max(1, Math.round((brightness / 254) * (LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1)))
}

// Convert step (0-43) to brightness (0-254)
// Step 0 = brightness 0, steps 1-43 map to brightness 1-254
export function stepToBrightness(step: number): number {
	if (step === 0) return 0
	// Map steps 1-43 to brightness 1-254
	return Math.max(1, Math.round((step / (LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1)) * 254))
}

export function LightControlTile({
	deviceName,
	className,
	onRequestBrightnessStepChange,
}: { deviceName: ZigbeeDeviceName; className?: string; onRequestBrightnessStepChange: (step: number) => void }) {
	const currentBrightnessStep = useAtomValue(useAtomValue(brightnessStepAtoms)[deviceName])
	// Map step to bar index for thumb position
	// Step 0 = OFF (no thumb shown, set to invalid index)
	// Step 1-43 map to bars 42-0
	const initialHighlightIndexStart =
		currentBrightnessStep === 0
			? LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1 // No thumb (index out of range, but no bars highlighted)
			: LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1 - currentBrightnessStep
	const touchContainerRef = useRef<HTMLDivElement | null>(null)
	const barRefs = useRef<(HTMLDivElement | null)[]>(
		Array.from({ length: LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT }, () => null),
	)
	const setIntermediateBrightnessStep = useSetAtom(useAtomValue(intermediateBrightnessStepAtoms)[deviceName])
	const setScene = useSetAtom(sceneAtom)
	const store = useStore()

	useEffect(() => {
		const brightnessStepAtom = store.get(brightnessStepAtoms)[deviceName]
		if (store.get(brightnessStepAtom) === currentBrightnessStep) {
			setIntermediateBrightnessStep(-1)
		}
	}, [currentBrightnessStep, deviceName, setIntermediateBrightnessStep, store])

	function requestBrightnessStepChange(step: number) {
		onRequestBrightnessStepChange(step)
		setScene(null)
	}

	const bind = useDrag(({ xy: [x], first, last }) => {
		if (!touchContainerRef.current) return

		if (!first) {
			touchContainerRef.current.dataset.active = "true"
		}

		if (last) {
			delete touchContainerRef.current.dataset.active
			let thumbIndex = -1
			for (let i = 0; i < LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT; i++) {
				const bar = barRefs.current[i]
				if (!bar) continue

				const barRect = bar.getBoundingClientRect()

				if (x >= barRect.left - 2 && x < barRect.right + 2 && thumbIndex === -1) {
					thumbIndex = i
					bar.dataset.thumb = "true"
				} else {
					delete bar.dataset.thumb
				}

				delete bar.dataset.touched
				delete bar.dataset.touchProximity
			}

			if (thumbIndex !== -1) {
				// Map bar index to step: bar 42 -> step 1, bar 0 -> step 43
				const step = LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1 - thumbIndex
				requestBrightnessStepChange(step)
			} else {
				const firstElement = barRefs.current[barRefs.current.length - 1]
				const lastElement = barRefs.current[0]
				if (lastElement && x > lastElement.getBoundingClientRect().right) {
					lastElement.dataset.thumb = "true"
					setIntermediateBrightnessStep(LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1)
					if (last) {
						requestBrightnessStepChange(LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1)
					}
				} else if (firstElement && x < firstElement.getBoundingClientRect().left) {
					firstElement.dataset.thumb = "true"
					setIntermediateBrightnessStep(0)
					if (last) {
						requestBrightnessStepChange(0)
					}
				}
			}
		} else {
			let touchedIndex = -1
			for (let i = 0; i < LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT; i++) {
				const bar = barRefs.current[i]
				if (!bar) continue

				const barRect = bar.getBoundingClientRect()

				delete bar.dataset.thumb

				if (x >= barRect.left - 2 && x < barRect.right + 2 && touchedIndex === -1) {
					touchedIndex = i

					bar.dataset.touched = "true"
					bar.dataset.highlighted = "false"
					delete bar.dataset.touchProximity

					const step = LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - i - 1
					setIntermediateBrightnessStep(step)

					if (barRefs.current[i - 1]) {
						barRefs.current[i - 1]!.dataset.touchProximity = "close"
					}
					if (barRefs.current[i - 2]) {
						barRefs.current[i - 2]!.dataset.touchProximity = "medium"
					}
					if (barRefs.current[i - 3]) {
						barRefs.current[i - 3]!.dataset.touchProximity = "far"
					}
				} else if (barRect.left < x) {
					if (bar.dataset.touched === "true") {
						bar.dataset.prevTouched = "true"
					} else {
						delete bar.dataset.prevTouched
					}
					bar.dataset.touched = "false"
					bar.dataset.highlighted = "true"
					if (touchedIndex >= 0) {
						const diff = i - touchedIndex
						if (diff === 1) {
							bar.dataset.touchProximity = "close"
						} else if (diff === 2) {
							bar.dataset.touchProximity = "medium"
						} else if (diff === 3) {
							bar.dataset.touchProximity = "far"
						} else {
							delete bar.dataset.touchProximity
						}
					} else {
						delete bar.dataset.touchProximity
					}
				} else if (barRect.right > x) {
					bar.dataset.highlighted = "false"
					bar.dataset.touched = "false"
					if (touchedIndex >= 0) {
						const diff = i - touchedIndex
						if (diff === 1) {
							bar.dataset.touchProximity = "close"
						} else if (diff === 2) {
							bar.dataset.touchProximity = "medium"
						} else if (diff === 3) {
							bar.dataset.touchProximity = "far"
						} else {
							delete bar.dataset.touchProximity
						}
					} else {
						delete bar.dataset.touchProximity
					}
				} else {
					bar.dataset.touched = "false"
					bar.dataset.highlighted = "false"
					delete bar.dataset.touchProximity
				}
			}

			if (touchedIndex === -1) {
				const firstElement = barRefs.current[barRefs.current.length - 1]
				const lastElement = barRefs.current[0]
				if (lastElement && x > lastElement.getBoundingClientRect().right) {
					lastElement.dataset.thumb = "true"
					setIntermediateBrightnessStep(LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1)
				} else if (firstElement && x < firstElement.getBoundingClientRect().left) {
					firstElement.dataset.thumb = "true"
					setIntermediateBrightnessStep(0)
				}
			}
		}
	})

	return (
		<Tile className={cn("h-full flex flex-col justify-start items-start", className)}>
			<div
				{...bind()}
				ref={touchContainerRef}
				className="group flex-1 flex flex-row-reverse justify-center items-center touch-none gap-x-1 w-full translate-y-4"
			>
				{Array.from({ length: LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT }).map((_, index) => {
					const highlighted = index > initialHighlightIndexStart
					return (
						<div
							data-highlighted={highlighted}
							data-thumb={index === initialHighlightIndexStart}
							data-prev-touched={false}
							data-touched={false}
							ref={(ref) => {
								barRefs.current[index] = ref
							}}
							// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
							key={index}
							className="transition-all transition-75 w-[2px] h-[2px] bg-neutral-400 rounded-full data-[highlighted=true]:h-2 data-[touch-proximity=close]:h-6 data-[touch-proximity=medium]:h-4 data-[touch-proximity=far]:h-2 data-[highlighted=true]:bg-teal-500 data-[touched=true]:h-8 data-[touched=true]:w-1 data-[touched=true]:bg-teal-500 data-[touched=true]:transition-none data-[prev-touched=true]:transition-none data-[thumb=true]:h-8 data-[thumb=true]:bg-teal-500"
						/>
					)
				})}
			</div>
			<div className="px-4 pb-2 w-full flex flex-row items-center justify-center space-x-2">
				<p className="tracking-tigher uppercase">{DEVICE_FRIENDLY_NAMES[deviceName]}</p>
				<BrightnessLevelLabel deviceName={deviceName} />
			</div>
		</Tile>
	)
}

function BrightnessLevelLabel({ deviceName }: { deviceName: ZigbeeDeviceName }) {
	const currentBrightnessStep = useAtomValue(useAtomValue(brightnessStepAtoms)[deviceName])
	const intermediateBrightnessStep = useAtomValue(useAtomValue(intermediateBrightnessStepAtoms)[deviceName])

	const step = intermediateBrightnessStep === -1 ? currentBrightnessStep : intermediateBrightnessStep

	let label: string
	if (step === 0) {
		label = "OFF"
	} else {
		// Convert step to percentage: step 1 = ~2%, step 43 = 100%
		const brightnessPercentage = Math.round((step / (LIGHT_CONTROL_TILE_SLIDER_BAR_COUNT - 1)) * 100)
		label = `${brightnessPercentage}%`
	}

	return (
		<p
			className={cn(
				"flex-1 text-right font-bold font-mono tracking-tigher",
				step === 0 ? "text-neutral-400" : "text-teal-400",
			)}
		>
			{label}
		</p>
	)
}

export function LightSceneTile({
	className,
	onSceneChange,
}: { className?: string; onSceneChange: (scene: LightSceneConfig) => void }) {
	const [activeSceneId, setActiveSceneId] = useAtom(sceneAtom)
	return (
		<Tile className={cn("h-full flex flex-col justify-start items-start p-1 gap-1", className)}>
			{Object.entries(DEFAULT_SCENES).map(([id, { icon: Icon, name }]) => (
				<button
					onClick={() => {
						setActiveSceneId(id)
						onSceneChange(DEFAULT_SCENES[id])
					}}
					key={id}
					type="button"
					className={cn(
						"w-full gap-2 flex flex-row items-end justify-start h-full border tracking-tigher first:rounded-t-lg last:rounded-b-lg transition-all duration-150 active:transition-none",
						activeSceneId === id
							? "p-2 border-teal-500 text-teal-500 border-2 font-bold"
							: "p-[9px] text-neutral-400 border-neutral-300 dark:border-neutral-800 active:shadow-inner active:bg-neutral-300 dark:active:bg-teal-500 active:text-neutral-900 font-lighter",
					)}
				>
					<Icon size={16} strokeWidth={2} />
					<p className="text-md tracking-none leading-none uppercase">{name}</p>
				</button>
			))}
		</Tile>
	)
}
