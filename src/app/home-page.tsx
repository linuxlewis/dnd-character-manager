import { Anchor, Button, Container, Group, Stack, Text, Title } from "@mantine/core";
import { ArrowRight, Backpack, BookOpen, HeartPulse, Sparkles, Swords } from "lucide-react";

const features = [
	{
		icon: HeartPulse,
		eyebrow: "A hero in motion",
		title: "Let every hard-earned level feel earned.",
		body: "See the character you started with become the one your party depends on. Keep level, experience, hit points, and recent changes close as the adventure reshapes them.",
		proof: "Name / class / level / XP / HP",
	},
	{
		icon: BookOpen,
		eyebrow: "Your moment to shine",
		title: "Reach for the spell that changes the fight.",
		body: "Keep the spells that define your character and their full details ready, then track the slots behind every clutch cast and narrow escape.",
		proof: "Search / save / inspect / use / restore",
	},
	{
		icon: Backpack,
		eyebrow: "The story you carry",
		title: "Make every hard-won treasure part of the character.",
		body: "Keep weapons, gear, quantities, equipped items, and coin together so the rewards of the road never disappear into a forgotten note.",
		proof: "Items / equipment / PP / GP / SP / CP",
	},
] as const;

export function HomePage() {
	return (
		<main className="landing-page">
			<header className="landing-nav">
				<Container size="xl" className="landing-nav-inner">
					<Anchor className="landing-brand" href="/" underline="never">
						<span className="landing-brand-mark" aria-hidden="true">
							<span />
							<span />
							<span />
							<span />
						</span>
						<span>D&amp;D Character Manager</span>
					</Anchor>
					<Group gap="lg" wrap="nowrap" className="landing-nav-links">
						<Anchor href="#features" c="inherit" underline="never">
							Features
						</Anchor>
						<Anchor href="/privacy" c="inherit" underline="never">
							Privacy
						</Anchor>
						<Button component="a" href="/characters" size="sm" className="landing-nav-cta">
							Open the app
						</Button>
					</Group>
				</Container>
			</header>

			<section className="landing-hero">
				<Container size="xl" className="landing-hero-grid">
					<Stack className="landing-hero-copy" gap="lg" align="flex-start">
						<Text className="landing-eyebrow">Every great story starts with a character</Text>
						<Title order={1}>Stay in the story. Your character is ready.</Title>
						<Text className="landing-hero-lede">
							Your character is more than a sheet of numbers. Keep the health, magic, gear, and
							hard-earned progress that bring them to life in one place built for the adventure.
						</Text>
						<Group gap="md" className="landing-hero-actions">
							<Button
								component="a"
								href="/characters/new"
								size="lg"
								rightSection={<ArrowRight size={18} aria-hidden="true" />}
								className="landing-primary-action"
							>
								Create your character
							</Button>
							<Anchor href="#features" className="landing-text-link">
								See what grows with them
							</Anchor>
						</Group>
						<Text className="landing-assurance">Free to begin. No account required.</Text>
					</Stack>

					<CharacterFolio />
				</Container>
			</section>

			<section className="landing-feature-section" id="features">
				<Container size="xl">
					<div className="landing-section-intro">
						<Text className="landing-eyebrow">A living record of the adventure</Text>
						<Title order={2}>Built for the character they are becoming.</Title>
						<Text>
							Every session changes something: a wound taken, a spell spent, a level earned, a relic
							claimed. Keep those changes close without letting the sheet pull you out of the
							moment.
						</Text>
					</div>

					<div className="landing-feature-list">
						{features.map(({ icon: Icon, eyebrow, title, body, proof }) => (
							<article className="landing-feature" key={eyebrow}>
								<div className="landing-feature-icon" aria-hidden="true">
									<Icon size={22} strokeWidth={1.8} />
								</div>
								<div className="landing-feature-copy">
									<Text className="landing-feature-eyebrow">{eyebrow}</Text>
									<Title order={3}>{title}</Title>
									<Text>{body}</Text>
								</div>
								<Text className="landing-feature-proof">{proof}</Text>
							</article>
						))}
					</div>
				</Container>
			</section>

			<section className="landing-session-section">
				<Container size="xl" className="landing-session-grid">
					<div className="landing-session-mark" aria-hidden="true">
						<Swords size={34} strokeWidth={1.5} />
					</div>
					<div>
						<Text className="landing-eyebrow">The adventure can start now</Text>
						<Title order={2}>Create the character you cannot wait to play.</Title>
					</div>
					<Stack gap="md" align="flex-start">
						<Text>
							Start without an account. Add a name, class, and level, then step straight into their
							workspace. Sign in later with an emailed link; no password to remember.
						</Text>
						<Anchor href="/characters" className="landing-arrow-link">
							Step into your character <ArrowRight size={17} aria-hidden="true" />
						</Anchor>
					</Stack>
				</Container>
			</section>

			<section className="landing-final-cta">
				<Container size="md" className="landing-final-cta-inner">
					<Sparkles size={24} aria-hidden="true" />
					<Title order={2}>The next chapter starts with a name.</Title>
					<Text className="landing-final-copy">
						Create a character, gather what matters, and leave more room for the decisions your
						party will remember.
					</Text>
					<Button
						component="a"
						href="/characters/new"
						size="lg"
						rightSection={<ArrowRight size={18} aria-hidden="true" />}
						className="landing-primary-action"
					>
						Create a character
					</Button>
				</Container>
			</section>
		</main>
	);
}

function CharacterFolio() {
	return (
		<section className="landing-folio-wrap" aria-label="Example character workspace">
			<div className="landing-orbit landing-orbit-one" aria-hidden="true" />
			<div className="landing-orbit landing-orbit-two" aria-hidden="true" />
			<article className="landing-folio">
				<header className="landing-folio-header">
					<div>
						<Text className="landing-folio-kicker">Ranger / level 7</Text>
						<Title order={2}>Aster Vale</Title>
					</div>
					<span className="landing-live-mark">Quest in progress</span>
				</header>

				<div className="landing-vitals">
					<div className="landing-hp-dial">
						<span>HP</span>
						<strong>42</strong>
						<small>/ 56</small>
					</div>
					<div className="landing-xp">
						<Group justify="space-between" gap="xs">
							<Text>Experience</Text>
							<Text>23,000 XP</Text>
						</Group>
						<div className="landing-xp-track">
							<span />
						</div>
						<Text>11,000 XP to level 8</Text>
					</div>
				</div>

				<div className="landing-folio-panels">
					<section>
						<Group justify="space-between">
							<Text className="landing-panel-title">Spell slots</Text>
							<BookOpen size={17} aria-hidden="true" />
						</Group>
						<SlotRow label="1st" filled={3} total={4} />
						<SlotRow label="2nd" filled={2} total={3} />
						<SlotRow label="3rd" filled={1} total={3} />
					</section>
					<section>
						<Group justify="space-between">
							<Text className="landing-panel-title">In the pack</Text>
							<Backpack size={17} aria-hidden="true" />
						</Group>
						<div className="landing-pack-item">
							<span>Moon-touched sword</span>
							<small>Equipped</small>
						</div>
						<div className="landing-pack-item">
							<span>Healer&apos;s kit</span>
							<small>x 2</small>
						</div>
						<div className="landing-coin-row">
							<span>184 GP</span>
							<span>32 SP</span>
						</div>
					</section>
				</div>
			</article>
		</section>
	);
}

function SlotRow({ label, filled, total }: { label: string; filled: number; total: number }) {
	const slots = ["one", "two", "three", "four"].slice(0, total);

	return (
		<div className="landing-slot-row">
			<Text>{label}</Text>
			<div role="img" aria-label={`${label} level spell slots: ${filled} of ${total} available`}>
				{slots.map((slot, index) => (
					<span key={`${label}-${slot}`} data-filled={index < filled} />
				))}
			</div>
		</div>
	);
}
