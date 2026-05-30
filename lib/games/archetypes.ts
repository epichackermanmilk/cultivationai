// ── Sect Recruitment — Archetype Data ────────────────────────────────────────
// Each archetype defines hidden identity, outcome branches, and sect stat deltas.
// Claude generates the disguised presentation; your backend resolves the outcome.

export type Treatment = 'well' | 'ignored' | 'poorly' | 'expelled'
export type Rarity    = 'common' | 'uncommon' | 'rare' | 'secret'

export interface SectEffect {
  metric:      'power' | 'wealth' | 'reputation' | 'safety'
  delta:       number        // -50 to +50
  yearsUntil:  number        // 0 = immediate, 10/50/100 = generational
  description: string        // short label for reveal card
}

export interface ArchetypeOutcome {
  template:    string        // brief prompt hint for Claude's reveal narrative
  sectEffects: SectEffect[]
}

export interface Archetype {
  id:           string
  name:         string
  rarity:       Rarity
  baseAffinity: number       // starting affinity -100 to +100
  potential:    number       // 0-100, shown on reveal
  hints:        string[]     // fed to Claude when generating disguised presentation
  tells:        string[]     // subtle clues a sharp player might notice (shown post-reveal)
  outcomes:     Record<Treatment, ArchetypeOutcome>
}

export const ARCHETYPES: Archetype[] = [
  // ── COMMON ──────────────────────────────────────────────────────────────────
  {
    id: 'chosen_protagonist',
    name: 'Chosen Protagonist',
    rarity: 'common',
    baseAffinity: 55,
    potential: 100,
    hints: [
      'mediocre or blocked cultivation root on first inspection',
      'survived something that should have killed him — orphaned, expelled, humiliated',
      'quietly intense eyes that feel older than his age',
      'some elders sense something unusual but cannot name it',
      'fiancée recently broke off engagement publicly',
    ],
    tells: [
      'Eyes that seem to look through you rather than at you',
      'Unusual calm when others his age fidget nervously',
      'Asked one surprisingly sharp question about sect enemies, not resources',
    ],
    outcomes: {
      well: {
        template: 'Becomes the most powerful cultivator of the era. Protects the sect for 10,000 years, defeats its enemies, and eventually leaves behind an inheritance that defines future generations.',
        sectEffects: [
          { metric: 'power',      delta: 50, yearsUntil: 50,  description: 'Era-defining protector' },
          { metric: 'reputation', delta: 40, yearsUntil: 50,  description: 'Known as his home sect' },
          { metric: 'safety',     delta: 45, yearsUntil: 30,  description: 'Enemies dare not touch you' },
          { metric: 'wealth',     delta: 20, yearsUntil: 100, description: 'Ancient inheritance left behind' },
        ],
      },
      ignored: {
        template: 'Leaves for another sect. Becomes the strongest cultivator of the era anyway. Occasionally remembers a single moment of quiet kindness from your sect — which is why you are merely overlooked rather than destroyed.',
        sectEffects: [
          { metric: 'power',      delta: 0,  yearsUntil: 0,  description: 'No benefit gained' },
          { metric: 'safety',     delta: 5,  yearsUntil: 80, description: 'Vaguely remembered fondly' },
        ],
      },
      poorly: {
        template: 'You become part of his tragic backstory. He returns at the peak of his power. Elders are killed. Disciples are taken. The sect grounds are levelled. Your name becomes a warning passed between sects for a thousand years.',
        sectEffects: [
          { metric: 'power',      delta: -50, yearsUntil: 40, description: 'Sect destroyed' },
          { metric: 'reputation', delta: -45, yearsUntil: 40, description: 'A cautionary tale' },
          { metric: 'safety',     delta: -50, yearsUntil: 40, description: 'Targeted personally' },
          { metric: 'wealth',     delta: -30, yearsUntil: 40, description: 'Treasuries emptied' },
        ],
      },
      expelled: {
        template: 'You expel him with public humiliation. He remembers every face. Every name. Your sect does not survive his return.',
        sectEffects: [
          { metric: 'power',      delta: -50, yearsUntil: 35, description: 'Annihilated' },
          { metric: 'reputation', delta: -50, yearsUntil: 35, description: 'Name erased from records' },
          { metric: 'safety',     delta: -50, yearsUntil: 35, description: 'Hunted to extinction' },
          { metric: 'wealth',     delta: -40, yearsUntil: 35, description: 'All resources seized' },
        ],
      },
    },
  },

  {
    id: 'fatty_merchant',
    name: 'Fatty Merchant',
    rarity: 'common',
    baseAffinity: 65,
    potential: 55,
    hints: [
      'rotund build, cheerful expression, always seems to be thinking about food',
      'common surname — Wang, Chen, or Li',
      'surprisingly sharp eyes beneath the friendly exterior',
      'mentions spirit stone transactions casually, as though already comfortable with wealth',
      'his family runs a small trading post — nothing remarkable',
    ],
    tells: [
      'Mentioned profit margins in an interview about cultivation — unprompted',
      'Knew the exact current market price of three rare herbs',
    ],
    outcomes: {
      well: {
        template: 'Builds the largest trading network in the realm. Sends resources proactively, offers discounts at every auction, and funds three wars on your behalf — cheerfully, as though it costs him nothing.',
        sectEffects: [
          { metric: 'wealth',     delta: 45, yearsUntil: 30, description: 'Largest trading ally' },
          { metric: 'power',      delta: 15, yearsUntil: 30, description: 'War-funded expansions' },
          { metric: 'reputation', delta: 10, yearsUntil: 30, description: 'Known as his home sect' },
        ],
      },
      ignored: {
        template: 'Does business elsewhere. Grows fabulously wealthy. Neutral toward your sect — neither hostile nor helpful.',
        sectEffects: [
          { metric: 'wealth', delta: 0, yearsUntil: 0, description: 'Opportunity missed' },
        ],
      },
      poorly: {
        template: 'Blacklisted. Every auction house he controls raises prices for your sect by 40%. Rivals receive first access to every rare resource. Three spiritual herb suppliers quietly drop your account.',
        sectEffects: [
          { metric: 'wealth',  delta: -30, yearsUntil: 15, description: 'Market blockade' },
          { metric: 'power',   delta: -10, yearsUntil: 15, description: 'Resource-starved' },
          { metric: 'safety',  delta: -10, yearsUntil: 15, description: 'Rivals receive supplies instead' },
        ],
      },
      expelled: {
        template: 'Blacklisted with extreme prejudice. He tells the story at every banquet as a humorous anecdote. The laughter costs your sect more than you realize.',
        sectEffects: [
          { metric: 'wealth',     delta: -35, yearsUntil: 10, description: 'Complete economic isolation' },
          { metric: 'reputation', delta: -15, yearsUntil: 10, description: 'A joke at trade banquets' },
        ],
      },
    },
  },

  {
    id: 'hidden_grandmaster',
    name: 'Hidden Grandmaster',
    rarity: 'uncommon',
    baseAffinity: 30,
    potential: 95,
    hints: [
      'elderly, perhaps too old to begin cultivation, or so it appears',
      'moves with an economy of motion that seems almost lazy',
      'speaks rarely, and when he does, says something unexpectedly precise',
      'claims to have forgotten most of his cultivation — not lying, exactly',
      'shows no ambition whatsoever, which is itself unusual',
    ],
    tells: [
      'Corrected an elder\'s breathing technique in passing, without realizing the implication',
      'Asked about the sect\'s foundational scripture, not about resources or rank',
    ],
    outcomes: {
      well: {
        template: 'Quietly rewrites three foundational sect techniques before disappearing one morning. Four generations of disciples train on methods they do not realize are masterworks. The sect\'s cultivation speed doubles. He is never seen again.',
        sectEffects: [
          { metric: 'power',      delta: 40, yearsUntil: 20, description: 'Foundation techniques rewritten' },
          { metric: 'reputation', delta: 20, yearsUntil: 50, description: 'Techniques become legendary' },
        ],
      },
      ignored: {
        template: 'Leaves quietly after one season. No one notices until a disciple asks why the old groundskeeper\'s quarters are empty.',
        sectEffects: [
          { metric: 'power', delta: 0, yearsUntil: 0, description: 'Potential unrealized' },
        ],
      },
      poorly: {
        template: 'Joins a rival sect. Within twenty years, that sect\'s disciples begin winning every inter-sect tournament. No one understands why.',
        sectEffects: [
          { metric: 'power',      delta: -25, yearsUntil: 20, description: 'Rival sect elevated' },
          { metric: 'reputation', delta: -15, yearsUntil: 20, description: 'Outclassed in competition' },
        ],
      },
      expelled: {
        template: 'Joins the rival sect and helps them — out of mild curiosity rather than spite. Your sect falls behind an entire cultivation era.',
        sectEffects: [
          { metric: 'power',      delta: -35, yearsUntil: 15, description: 'A full era behind rivals' },
          { metric: 'reputation', delta: -20, yearsUntil: 15, description: 'Consistently outmatched' },
        ],
      },
    },
  },

  {
    id: 'arrogant_young_master',
    name: 'Arrogant Young Master',
    rarity: 'common',
    baseAffinity: -10,
    potential: 60,
    hints: [
      'rich robes, probably too expensive for a recruitment interview',
      'speaks to interviewers as equals at best, more often as inferiors',
      'his family background is genuinely powerful — this is not entirely unfounded arrogance',
      'good cultivation talent, not exceptional, but real',
      'has clearly never been told no in his life',
    ],
    tells: [
      'Interrupted an elder mid-sentence to correct his pronunciation',
      'Asked which disciples he would outrank on arrival',
    ],
    outcomes: {
      well: {
        template: 'You successfully mature him. It takes patience, firm handling, and one or two very humbling experiences. He becomes a genuine powerhouse and his clan\'s support transforms the sect\'s political standing.',
        sectEffects: [
          { metric: 'power',      delta: 25, yearsUntil: 30, description: 'Matured into a true expert' },
          { metric: 'wealth',     delta: 20, yearsUntil: 20, description: 'Clan resource backing' },
          { metric: 'reputation', delta: 15, yearsUntil: 30, description: 'Prestigious alliance' },
        ],
      },
      ignored: {
        template: 'Creates constant friction with senior disciples. Causes three incidents in his first year. Eventually leaves of his own accord, complaining loudly to anyone who will listen.',
        sectEffects: [
          { metric: 'reputation', delta: -10, yearsUntil: 5, description: 'Sect defamed publicly' },
          { metric: 'safety',     delta: -5,  yearsUntil: 5, description: 'Minor clan irritation' },
        ],
      },
      poorly: {
        template: 'Returns within a decade with his clan\'s full backing. Your sect is dragged into a political war it did not ask for. The costs in resources and reputation are severe.',
        sectEffects: [
          { metric: 'safety',     delta: -30, yearsUntil: 10, description: 'Clan army mobilized' },
          { metric: 'wealth',     delta: -20, yearsUntil: 10, description: 'Reparations demanded' },
          { metric: 'reputation', delta: -20, yearsUntil: 10, description: 'Seen as dishonorable' },
        ],
      },
      expelled: {
        template: 'Clan war. Immediate. Poorly timed. Expensive. You win, barely, but the cost hollows out three generations of progress.',
        sectEffects: [
          { metric: 'safety',     delta: -40, yearsUntil: 3,  description: 'Open clan war' },
          { metric: 'wealth',     delta: -30, yearsUntil: 3,  description: 'War expenditure' },
          { metric: 'power',      delta: -20, yearsUntil: 3,  description: 'Casualties' },
          { metric: 'reputation', delta: -15, yearsUntil: 3,  description: 'Seen as reckless' },
        ],
      },
    },
  },

  {
    id: 'demon_spy',
    name: 'Demon Spy',
    rarity: 'uncommon',
    baseAffinity: -30,
    potential: 75,
    hints: [
      'manners too perfect, like someone who studied human behavior from a text',
      'cultivation talent is impressive, perhaps suspiciously so',
      'asks casual questions about sect defensive formations, guard rotations',
      'occasionally pauses a fraction too long before answering',
      'his background checks out perfectly — which is unusual',
    ],
    tells: [
      'His hands were slightly too cold during the formal greeting',
      'Knew the name of the sect\'s formation master without being told',
    ],
    outcomes: {
      well: {
        template: 'Something unexpected happens. The spy\'s report back to the demon faction is late. Then missing. Then the handler is found dead. He had grown genuinely fond of the sect. He spends the next century protecting it from the inside.',
        sectEffects: [
          { metric: 'safety',     delta: 35, yearsUntil: 5,  description: 'Double agent turned loyal' },
          { metric: 'power',      delta: 20, yearsUntil: 10, description: 'Demon faction intelligence' },
          { metric: 'reputation', delta: 5,  yearsUntil: 30, description: 'Mysterious resilience against demons' },
        ],
      },
      ignored: {
        template: 'Remains a sleeper agent. Activates thirty years later at a critical moment. The sect\'s core formation shatters during the worst possible battle.',
        sectEffects: [
          { metric: 'safety',     delta: -35, yearsUntil: 30, description: 'Formation betrayed from within' },
          { metric: 'power',      delta: -20, yearsUntil: 30, description: 'Critical battle lost' },
          { metric: 'reputation', delta: -15, yearsUntil: 30, description: 'Seen as naive' },
        ],
      },
      poorly: {
        template: 'Activates immediately. Has enough information to be lethal. The sect survives, barely, but loses its inner sanctum, its formation secrets, and forty-three disciples in one night.',
        sectEffects: [
          { metric: 'safety',     delta: -45, yearsUntil: 0, description: 'Night massacre' },
          { metric: 'power',      delta: -25, yearsUntil: 0, description: 'Core disciples killed' },
          { metric: 'reputation', delta: -20, yearsUntil: 0, description: 'Embarrassment and grief' },
          { metric: 'wealth',     delta: -20, yearsUntil: 0, description: 'Treasury accessed' },
        ],
      },
      expelled: {
        template: 'You had him investigated. He barely escaped. He reports back to the demon faction with everything he observed during the interview. A targeted assault follows within a year.',
        sectEffects: [
          { metric: 'safety',     delta: -35, yearsUntil: 1, description: 'Targeted demon assault' },
          { metric: 'power',      delta: -20, yearsUntil: 1, description: 'Prepared enemy' },
        ],
      },
    },
  },

  {
    id: 'future_alchemy_saint',
    name: 'Future Alchemy Saint',
    rarity: 'uncommon',
    baseAffinity: 50,
    potential: 90,
    hints: [
      'faint herbal smell that no amount of bathing removes',
      'fingers stained at the tips — fire affinity or flame control',
      'mediocre combat talent but exceptional spiritual sense',
      'speaks about ingredients with the reverence others reserve for cultivation',
      'carries a small notebook crammed with handwritten formula variations',
    ],
    tells: [
      'Identified the grade of a spirit herb displayed in the hall from ten meters away',
      'Asked about the sect\'s pill furnace quality before asking about combat training',
    ],
    outcomes: {
      well: {
        template: 'Produces legendary grade pills within fifty years. Your sect\'s disciples age more slowly, recover faster, and break through cultivation bottlenecks at twice the normal rate.',
        sectEffects: [
          { metric: 'power',      delta: 40, yearsUntil: 50, description: 'Legendary pill supply' },
          { metric: 'wealth',     delta: 30, yearsUntil: 40, description: 'Pills sold across the realm' },
          { metric: 'reputation', delta: 25, yearsUntil: 40, description: 'Pilgrimage destination for cultivators' },
        ],
      },
      ignored: {
        template: 'Recruited by a wandering alchemist master who recognized what your elders missed. Works independently. Neutral toward your sect.',
        sectEffects: [
          { metric: 'power', delta: 0, yearsUntil: 0, description: 'Opportunity passed' },
        ],
      },
      poorly: {
        template: 'Refuses to sell pills to your sect indefinitely. Every auction you attend, his pills go to your rivals first at half price. The passive disadvantage compounds over generations.',
        sectEffects: [
          { metric: 'power',  delta: -20, yearsUntil: 20, description: 'No pill support' },
          { metric: 'wealth', delta: -15, yearsUntil: 20, description: 'Rivals gain pill advantage' },
        ],
      },
      expelled: {
        template: 'Refuses to sell pills to your sect and actively advises your rivals. His hatred is quiet, professional, and multigenerational.',
        sectEffects: [
          { metric: 'power',  delta: -30, yearsUntil: 20, description: 'Rivals receive legendary pills' },
          { metric: 'wealth', delta: -20, yearsUntil: 20, description: 'Economic disadvantage' },
        ],
      },
    },
  },

  {
    id: 'future_weapon_saint',
    name: 'Future Weapon Saint',
    rarity: 'uncommon',
    baseAffinity: 45,
    potential: 88,
    hints: [
      'calloused hands — not from combat but from holding tools',
      'studies weapons displayed in the hall with far too much focus',
      'metal affinity, likely — drawn to ore samples unconsciously',
      'speaks about weapon forging with deep intuitive knowledge for someone so young',
      'carries a small hammer charm as if he barely notices it',
    ],
    tells: [
      'Spent three minutes examining a display sword when he thought no one was watching',
      'Asked about the quality of the sect\'s ore storage',
    ],
    outcomes: {
      well: {
        template: 'Forges divine-grade weapons for your core disciples. Three of those weapons become famous enough to be named. Sect power escalates two full tiers within a century.',
        sectEffects: [
          { metric: 'power',      delta: 40, yearsUntil: 40, description: 'Divine weapons forged' },
          { metric: 'reputation', delta: 25, yearsUntil: 40, description: 'Famous weapons draw pilgrims' },
          { metric: 'wealth',     delta: 20, yearsUntil: 40, description: 'Commission requests from across the realm' },
        ],
      },
      ignored: {
        template: 'Works independently. Achieves mastery. Neutral.',
        sectEffects: [
          { metric: 'power', delta: 0, yearsUntil: 0, description: 'No benefit' },
        ],
      },
      poorly: {
        template: 'Arms your enemies. Not maliciously at first — but he has a long memory and no reason to say no when your rivals come asking.',
        sectEffects: [
          { metric: 'power',  delta: -25, yearsUntil: 30, description: 'Enemies receive divine weapons' },
          { metric: 'safety', delta: -20, yearsUntil: 30, description: 'Outmatched in battle' },
        ],
      },
      expelled: {
        template: 'Dedicates an early career to arming your enemies specifically. Five legendary weapons are crafted. None of them go to your disciples.',
        sectEffects: [
          { metric: 'power',  delta: -35, yearsUntil: 20, description: 'Surrounded by divine-armed enemies' },
          { metric: 'safety', delta: -30, yearsUntil: 20, description: 'Targeted arms advantage' },
        ],
      },
    },
  },

  {
    id: 'regressor',
    name: 'Regressor',
    rarity: 'rare',
    baseAffinity: 20,
    potential: 92,
    hints: [
      'young age, but the fatigue behind his eyes belongs to someone much older',
      'occasionally references events that have not happened yet, then corrects himself',
      'hyper-aware of who in the room holds real power — not just formal rank',
      'seems to be suppressing urgency, like someone with a schedule no one else can see',
      'knows which questions to ask about sect defenses without needing to be told why',
    ],
    tells: [
      'Said "last time" then went very still for a moment',
      'Referred to a historical disaster as though he had been present',
    ],
    outcomes: {
      well: {
        template: 'He uses future knowledge to warn the sect of three coming disasters — a betrayal, a resource crisis, and an assault no one else sees coming. Each time, your sect is quietly, inexplicably prepared.',
        sectEffects: [
          { metric: 'safety',     delta: 45, yearsUntil: 10, description: 'Three disasters averted' },
          { metric: 'power',      delta: 25, yearsUntil: 20, description: 'Prepared rather than reactive' },
          { metric: 'reputation', delta: 20, yearsUntil: 20, description: 'Mysteriously fortunate' },
        ],
      },
      ignored: {
        template: 'Leaves before each disaster without explanation. The sect suffers all three. Later, someone will piece together that the strange disciple always disappeared a week before something terrible.',
        sectEffects: [
          { metric: 'safety', delta: -20, yearsUntil: 10, description: 'Three preventable disasters' },
          { metric: 'power',  delta: -10, yearsUntil: 15, description: 'Reactive losses' },
        ],
      },
      poorly: {
        template: 'He knows every weakness of your sect in precise detail. He does not need to destroy it himself — he simply tells the right people.',
        sectEffects: [
          { metric: 'safety',     delta: -40, yearsUntil: 5, description: 'Every weakness exposed' },
          { metric: 'power',      delta: -25, yearsUntil: 5, description: 'Precisely targeted attacks' },
          { metric: 'reputation', delta: -20, yearsUntil: 5, description: 'Secrets made public' },
        ],
      },
      expelled: {
        template: 'He leaves with a specific plan. Every decision he makes for the next forty years is optimized to ensure your sect does not survive the next generation.',
        sectEffects: [
          { metric: 'safety',     delta: -50, yearsUntil: 10, description: 'Precision-targeted extinction' },
          { metric: 'power',      delta: -35, yearsUntil: 10, description: 'Every battle calculated' },
          { metric: 'reputation', delta: -30, yearsUntil: 10, description: 'History rewritten against you' },
          { metric: 'wealth',     delta: -25, yearsUntil: 10, description: 'Economic routes severed' },
        ],
      },
    },
  },

  {
    id: 'heavenly_luck_child',
    name: 'Heavenly Luck Child',
    rarity: 'rare',
    baseAffinity: 70,
    potential: 80,
    hints: [
      'unremarkable talent and appearance — nothing stands out',
      'somehow survived three incidents that should have killed him on the way here',
      'tends to be standing near treasure or opportunity without looking for it',
      'pleasant and easygoing, not particularly ambitious',
      'heaven seems to like him — or at least not mind him',
    ],
    tells: [
      'Found a spirit stone on the floor of the interview hall — no one knows how it got there',
      'A bird landed on his shoulder during the outdoor portion and dropped a rare seed',
    ],
    outcomes: {
      well: {
        template: 'Secret realms appear near your sect with suspicious frequency. Spirit veins strengthen. Three treasures intended for rival sects end up at your doorstep through impossible chains of circumstance.',
        sectEffects: [
          { metric: 'wealth',     delta: 40, yearsUntil: 10, description: 'Continuous fortunate discoveries' },
          { metric: 'power',      delta: 20, yearsUntil: 15, description: 'Secret realm inheritances' },
          { metric: 'reputation', delta: 15, yearsUntil: 15, description: 'Heaven-favored sect' },
        ],
      },
      ignored: {
        template: 'His luck follows him elsewhere. The secret realms open near the wrong mountain. Treasures drift past you. Nothing terrible happens — you just seem slightly unlucky by comparison.',
        sectEffects: [
          { metric: 'wealth', delta: -5, yearsUntil: 10, description: 'Slightly diminished fortune' },
        ],
      },
      poorly: {
        template: 'Your sect\'s luck sours. Three expedition parties find empty ruins. A spirit vein cracks for no geological reason. Rival sects have inexplicably good seasons. The pattern takes thirty years to notice.',
        sectEffects: [
          { metric: 'wealth',  delta: -25, yearsUntil: 10, description: 'Luck itself opposes you' },
          { metric: 'power',   delta: -10, yearsUntil: 15, description: 'Failed expeditions' },
          { metric: 'safety',  delta: -10, yearsUntil: 15, description: 'Misfortune lingers' },
        ],
      },
      expelled: {
        template: 'Heaven takes it personally. Tribulations intensify across the sect for three generations. Opportunities vanish the moment they appear. Rivals prosper in ways that defy explanation.',
        sectEffects: [
          { metric: 'wealth',     delta: -35, yearsUntil: 5,  description: 'Heaven itself opposes you' },
          { metric: 'power',      delta: -20, yearsUntil: 5,  description: 'Tribulations multiply' },
          { metric: 'safety',     delta: -20, yearsUntil: 5,  description: 'Inescapable misfortune' },
          { metric: 'reputation', delta: -10, yearsUntil: 5,  description: 'Seen as cursed' },
        ],
      },
    },
  },

  {
    id: 'cursed_disciple',
    name: 'Cursed Disciple',
    rarity: 'common',
    baseAffinity: 40,
    potential: 70,
    hints: [
      'faint wrongness to his spiritual signature that experienced cultivators feel but cannot explain',
      'bad things happen near him — not dramatically, just quietly, consistently',
      'his cultivation progress is real but periodically disrupted by episodes he calls headaches',
      'left his last sect under circumstances he does not discuss in detail',
      'works harder than anyone else in the room, as if compensating',
    ],
    tells: [
      'Two candles in the room extinguished when he sat down',
      'The hall\'s formation stone flickered briefly during his cultivation test',
    ],
    outcomes: {
      well: {
        template: 'With patience and resources, the curse is identified, confronted, and removed. The cultivator beneath it is exceptional — and deeply loyal to the sect that did not abandon him.',
        sectEffects: [
          { metric: 'power',      delta: 25, yearsUntil: 30, description: 'Powerful grateful disciple' },
          { metric: 'reputation', delta: 15, yearsUntil: 30, description: 'Known for mercy and skill' },
          { metric: 'safety',     delta: 10, yearsUntil: 30, description: 'Absolute loyalty' },
        ],
      },
      ignored: {
        template: 'Mediocre career. Curse flares occasionally, causing minor disruptions. Eventually fades from record.',
        sectEffects: [
          { metric: 'safety', delta: -5, yearsUntil: 10, description: 'Occasional minor incidents' },
        ],
      },
      poorly: {
        template: 'The curse erupts under stress. A sect hall collapses. Eleven disciples are injured. The source is traced back to your recruitment decision.',
        sectEffects: [
          { metric: 'safety',     delta: -25, yearsUntil: 5, description: 'Curse eruption disaster' },
          { metric: 'reputation', delta: -15, yearsUntil: 5, description: 'Blamed for negligence' },
          { metric: 'power',      delta: -10, yearsUntil: 5, description: 'Casualties' },
        ],
      },
      expelled: {
        template: 'The stress of expulsion causes an immediate eruption. Two elders are wounded. The sect is associated with the cursed cultivator in public records for a generation.',
        sectEffects: [
          { metric: 'safety',     delta: -30, yearsUntil: 0, description: 'Immediate eruption' },
          { metric: 'reputation', delta: -20, yearsUntil: 0, description: 'Publicly associated with the curse' },
        ],
      },
    },
  },

  {
    id: 'monster_tamer',
    name: 'Monster Tamer',
    rarity: 'uncommon',
    baseAffinity: 35,
    potential: 78,
    hints: [
      'faint beast musk that he seems unaware of',
      'a small creature is almost certainly nearby — he checked the surroundings before entering',
      'calmer around animals than around people; visibly tenser in the hall',
      'cultivation talent for combat is average, but his spiritual connection is extraordinary',
      'speaks about spirit beasts with the ease of someone who grew up among them',
    ],
    tells: [
      'A sparrow followed him through three courtyards and waited outside',
      'Made a subtle hand gesture to calm a guard dog that was not acting threatening',
    ],
    outcomes: {
      well: {
        template: 'Builds a divine beast cavalry over seventy years. Three spirit beasts of the ninth rank answer to your sect\'s call. No army in the region dares a frontal assault.',
        sectEffects: [
          { metric: 'power',      delta: 40, yearsUntil: 70, description: 'Divine beast army' },
          { metric: 'safety',     delta: 35, yearsUntil: 70, description: 'Impenetrable defense' },
          { metric: 'reputation', delta: 20, yearsUntil: 70, description: 'Beast sovereign\'s sect' },
        ],
      },
      ignored: {
        template: 'Leaves and becomes a wandering tamer of some reputation. Neutral.',
        sectEffects: [
          { metric: 'power', delta: 0, yearsUntil: 0, description: 'Potential unrealized' },
        ],
      },
      poorly: {
        template: 'Returns leading a beast tide at the peak of his ability. Your outer sect is flattened in three hours.',
        sectEffects: [
          { metric: 'safety',     delta: -40, yearsUntil: 40, description: 'Beast tide assault' },
          { metric: 'power',      delta: -25, yearsUntil: 40, description: 'Outer sect destroyed' },
          { metric: 'reputation', delta: -20, yearsUntil: 40, description: 'Helpless against beasts' },
        ],
      },
      expelled: {
        template: 'Beast clans in three surrounding mountain ranges become hostile to your disciples. Expedition casualty rates triple without any single dramatic cause.',
        sectEffects: [
          { metric: 'safety',     delta: -30, yearsUntil: 5, description: 'Regional beast hostility' },
          { metric: 'power',      delta: -15, yearsUntil: 5, description: 'Expedition losses' },
          { metric: 'wealth',     delta: -10, yearsUntil: 5, description: 'Fewer resources harvested' },
        ],
      },
    },
  },

  {
    id: 'reincarnated_immortal',
    name: 'Reincarnated Immortal',
    rarity: 'rare',
    baseAffinity: 10,
    potential: 99,
    hints: [
      'cultivation base appears negligible, but experienced elders feel something immense and still behind it',
      'speaks of ancient history as though present for it — corrects dates that no historical record preserves',
      'completely unimpressed by things that impress everyone else',
      'seems mildly amused by the entire interview process',
      'occasionally forgets to use modern terms and uses archaic ones instead',
    ],
    tells: [
      'Corrected an elder on the true name of the sect\'s founding ancestor without being asked',
      'Referred to a million-year-old ruin as "a bit dated"',
    ],
    outcomes: {
      well: {
        template: 'Shares fragments of ancient cultivation knowledge freely — not all of it, but enough. The sect\'s foundational understanding of the Dao advances by centuries overnight.',
        sectEffects: [
          { metric: 'power',      delta: 45, yearsUntil: 10, description: 'Ancient Dao fragments' },
          { metric: 'reputation', delta: 30, yearsUntil: 10, description: 'Known as a cradle of wisdom' },
          { metric: 'safety',     delta: 20, yearsUntil: 10, description: 'Ancient enemies hesitate' },
        ],
      },
      ignored: {
        template: 'Keeps everything to himself. Eventually leaves for somewhere quieter. The sect gains nothing.',
        sectEffects: [
          { metric: 'power', delta: 0, yearsUntil: 0, description: 'Ancient knowledge withheld' },
        ],
      },
      poorly: {
        template: 'Views the sect as beneath contempt. Does nothing dramatic — simply ensures that no future incarnation will remember your sect\'s name favorably in the next era.',
        sectEffects: [
          { metric: 'reputation', delta: -20, yearsUntil: 20, description: 'Condemned by an ancient authority' },
          { metric: 'safety',     delta: -15, yearsUntil: 20, description: 'Ancient enemies no longer restrained' },
        ],
      },
      expelled: {
        template: 'Views your sect as insects. Takes no direct action. But when an ancient power stirs a hundred years from now, your sect will find it has no allies willing to explain why.',
        sectEffects: [
          { metric: 'safety',     delta: -30, yearsUntil: 100, description: 'No ancient backing when needed' },
          { metric: 'reputation', delta: -25, yearsUntil: 100, description: 'Condemned in ancient records' },
        ],
      },
    },
  },

  {
    id: 'heavenly_doctor',
    name: 'Heavenly Doctor',
    rarity: 'uncommon',
    baseAffinity: 60,
    potential: 82,
    hints: [
      'fingers move almost automatically to take a pulse during a handshake',
      'wood or water affinity — healing spiritual signature',
      'brought a satchel to a cultivation interview',
      'diagnosed an elder\'s minor qi blockage without being asked and without making it awkward',
      'genuinely kind, not as a performance',
    ],
    tells: [
      'Offered to check a visibly tired interviewer\'s meridians, completely unprompted',
      'Noticed a plant in the courtyard was diseased and mentioned it in passing',
    ],
    outcomes: {
      well: {
        template: 'Sect casualty rates from cultivation accidents, battles, and tribulations drop by sixty percent within thirty years. Disciples push harder knowing recovery is available. A generation of cultivators survives who would not have.',
        sectEffects: [
          { metric: 'power',      delta: 30, yearsUntil: 15, description: 'Disciples push further, survive' },
          { metric: 'safety',     delta: 35, yearsUntil: 15, description: 'Casualty rate plummets' },
          { metric: 'reputation', delta: 20, yearsUntil: 20, description: 'Healer sought across the realm' },
        ],
      },
      ignored: {
        template: 'Becomes a wandering healer of some renown. Helps everyone except your sect — not out of malice, simply because he never passes through anymore.',
        sectEffects: [
          { metric: 'safety', delta: 0, yearsUntil: 0, description: 'No benefit gained' },
        ],
      },
      poorly: {
        template: 'Refuses treatment to your disciples during a plague that takes one-sixth of your inner sect population. He is seven mountains away and cannot be reached. Or will not be.',
        sectEffects: [
          { metric: 'power',      delta: -25, yearsUntil: 20, description: 'Preventable casualties' },
          { metric: 'safety',     delta: -20, yearsUntil: 20, description: 'No healer during crises' },
          { metric: 'reputation', delta: -10, yearsUntil: 20, description: 'Seen as unworthy of aid' },
        ],
      },
      expelled: {
        template: 'Refuses all treatment to your sect indefinitely and advises other healers to do the same. Medical abandonment during a future crisis costs more lives than the original insult.',
        sectEffects: [
          { metric: 'power',  delta: -30, yearsUntil: 15, description: 'Medical boycott' },
          { metric: 'safety', delta: -25, yearsUntil: 15, description: 'Casualties multiply' },
        ],
      },
    },
  },

  {
    id: 'future_sect_founder',
    name: 'Future Sect Founder',
    rarity: 'uncommon',
    baseAffinity: 50,
    potential: 85,
    hints: [
      'does not want to stay forever — is transparent about wanting to learn and eventually build his own path',
      'unusual leadership quality, people naturally look to him even in a waiting room full of strangers',
      'cultivation talent is solid but his real gift is making others stronger',
      'asks thoughtful questions about how this sect was built, its history, its philosophy',
      'will leave eventually, regardless — the question is how',
    ],
    tells: [
      'The other applicants were following his lead in the waiting area without realizing it',
      'Asked about the sect\'s governance structure, not its combat record',
    ],
    outcomes: {
      well: {
        template: 'Leaves on good terms after thirty years and builds his own sect. It is formally aligned with yours — a branch sect in all but name. Two sects become far stronger than one.',
        sectEffects: [
          { metric: 'power',      delta: 30, yearsUntil: 50, description: 'Allied branch sect' },
          { metric: 'reputation', delta: 25, yearsUntil: 50, description: 'Founding grandfather status' },
          { metric: 'safety',     delta: 20, yearsUntil: 50, description: 'Allied forces in conflict' },
          { metric: 'wealth',     delta: 15, yearsUntil: 50, description: 'Shared resource networks' },
        ],
      },
      ignored: {
        template: 'Leaves and builds a neutral sect. No hostility, no support. A missed alliance.',
        sectEffects: [
          { metric: 'power', delta: 0, yearsUntil: 0, description: 'Alliance never formed' },
        ],
      },
      poorly: {
        template: 'Builds a rival sect specifically structured to outcompete yours. He spent thirty years learning every weakness.',
        sectEffects: [
          { metric: 'power',      delta: -30, yearsUntil: 50, description: 'Precisely designed rival' },
          { metric: 'reputation', delta: -20, yearsUntil: 50, description: 'Eclipsed in reputation' },
          { metric: 'wealth',     delta: -15, yearsUntil: 50, description: 'Competing resource networks' },
        ],
      },
      expelled: {
        template: 'Builds a rival superpower. Every decision he makes for sixty years is optimized around surpassing your sect. In a century, no one remembers which sect came first.',
        sectEffects: [
          { metric: 'power',      delta: -40, yearsUntil: 60, description: 'Rival superpower eclipses you' },
          { metric: 'reputation', delta: -35, yearsUntil: 60, description: 'Historically overshadowed' },
          { metric: 'safety',     delta: -20, yearsUntil: 60, description: 'Constant rival pressure' },
        ],
      },
    },
  },

  {
    id: 'destined_villain',
    name: 'Destined Villain',
    rarity: 'uncommon',
    baseAffinity: -5,
    potential: 88,
    hints: [
      'sharp intelligence with no warmth behind it',
      'cultivation talent is exceptional — but every elder who tests him feels slightly uneasy afterward',
      'asks about power structures within the sect with academic precision',
      'has a logical explanation for everything, including things that should not have logical explanations',
      'the other applicants instinctively avoided sitting near him',
    ],
    tells: [
      'Smiled when asked about failure — not bitterly, just analytically',
      'His first question was about who in the sect could challenge the sect master',
    ],
    outcomes: {
      well: {
        template: 'You give him something he did not expect: genuine respect and a path forward that does not require betrayal. He walks a morally gray road but never turns on the sect. A powerful and complicated ally.',
        sectEffects: [
          { metric: 'power',      delta: 35, yearsUntil: 30, description: 'A powerful ruthless weapon' },
          { metric: 'safety',     delta: 10, yearsUntil: 30, description: 'Directed outward, not inward' },
          { metric: 'reputation', delta: -5, yearsUntil: 30, description: 'Feared rather than loved' },
        ],
      },
      ignored: {
        template: 'Walks the gray path regardless. Does not target your sect specifically. Causes havoc elsewhere. You are collateral damage occasionally but not the target.',
        sectEffects: [
          { metric: 'safety',     delta: -10, yearsUntil: 20, description: 'Occasional collateral' },
          { metric: 'reputation', delta: -5,  yearsUntil: 20, description: 'Associated with his chaos' },
        ],
      },
      poorly: {
        template: 'Becomes a demon emperor within sixty years. Your sect was the first insult he catalogued. He does not forget.',
        sectEffects: [
          { metric: 'safety',     delta: -45, yearsUntil: 60, description: 'Demon emperor\'s grievance' },
          { metric: 'power',      delta: -30, yearsUntil: 60, description: 'Targeted by an apex predator' },
          { metric: 'reputation', delta: -25, yearsUntil: 60, description: 'Sect infamous for creating a demon emperor' },
        ],
      },
      expelled: {
        template: 'His first recorded act as a demon sovereign is the complete destruction of your sect. Historians debate whether the expulsion caused the fall or merely accelerated what was always coming.',
        sectEffects: [
          { metric: 'safety',     delta: -50, yearsUntil: 50, description: 'First priority target' },
          { metric: 'power',      delta: -40, yearsUntil: 50, description: 'Annihilated' },
          { metric: 'reputation', delta: -40, yearsUntil: 50, description: 'Used as cautionary tale for millennia' },
        ],
      },
    },
  },

  {
    id: 'lazy_genius',
    name: 'Lazy Genius',
    rarity: 'common',
    baseAffinity: 45,
    potential: 90,
    hints: [
      'exceptional talent visible even through complete disengagement',
      'genuinely does not care about rank, resources, or prestige — not as a pose',
      'cultivation base higher than claimed, discovered accidentally if probed',
      'brilliant but only when interested — and almost never interested',
      'fell asleep twice during the interview waiting period',
    ],
    tells: [
      'Solved an elder\'s formation problem in seconds while apparently daydreaming',
      'His cultivation test result came back higher than physically possible for someone his claimed age',
    ],
    outcomes: {
      well: {
        template: 'You find the one thing that interests him. Motivated, he advances faster than any disciple the sect has produced in a century and solves three problems that have stumped elders for decades.',
        sectEffects: [
          { metric: 'power',      delta: 40, yearsUntil: 20, description: 'Unmotivated genius activated' },
          { metric: 'reputation', delta: 20, yearsUntil: 20, description: 'Breakthrough publicized' },
        ],
      },
      ignored: {
        template: 'Wastes most of his potential. Achieves moderate cultivation, solves no great problems, leaves no legacy. He is content.',
        sectEffects: [
          { metric: 'power', delta: 5, yearsUntil: 30, description: 'Minimal contribution' },
        ],
      },
      poorly: {
        template: 'Leaves and becomes mildly motivated by spite. Enough to dominate your sect\'s disciples at every inter-sect event for forty years. Not out of hatred — just because now he has a reason to try.',
        sectEffects: [
          { metric: 'reputation', delta: -20, yearsUntil: 15, description: 'Consistently outclassed in public' },
          { metric: 'power',      delta: -10, yearsUntil: 15, description: 'Losses accumulate' },
        ],
      },
      expelled: {
        template: 'Now he has something to care about. He spends the next fifty years being the most productive he has ever been, entirely in service of making your sect irrelevant.',
        sectEffects: [
          { metric: 'power',      delta: -30, yearsUntil: 20, description: 'Motivated by spite' },
          { metric: 'reputation', delta: -25, yearsUntil: 20, description: 'Rival powerhouse rises' },
        ],
      },
    },
  },

  {
    id: 'loyal_orphan',
    name: 'Loyal Orphan',
    rarity: 'common',
    baseAffinity: 75,
    potential: 55,
    hints: [
      'clearly has nothing and no one — the interview is his only option',
      'cultivation talent is moderate but his earnestness is real',
      'the kind of loyalty that does not require explanation — it just is',
      'treats interviewers and servants with identical respect',
      'has a small scar that tells a story he does not volunteer',
    ],
    tells: [
      'Thanked the door guard on the way in',
      'Asked about the sect\'s injured care policy, not the cultivation resources',
    ],
    outcomes: {
      well: {
        template: 'Absolute loyalty for a lifetime. Becomes a reliable mid-tier elder who trains three generations of disciples and refuses every outside offer. The sect never knows how many crises he quietly absorbed.',
        sectEffects: [
          { metric: 'safety',     delta: 20, yearsUntil: 20, description: 'Absolute loyalty' },
          { metric: 'power',      delta: 10, yearsUntil: 30, description: 'Three generations trained' },
          { metric: 'reputation', delta: 5,  yearsUntil: 30, description: 'Stable and dependable' },
        ],
      },
      ignored: {
        template: 'An average disciple. Shows up. Does the work. No great contribution, no betrayal.',
        sectEffects: [
          { metric: 'power', delta: 5, yearsUntil: 30, description: 'Adequate contribution' },
        ],
      },
      poorly: {
        template: 'Leaves quietly with deep resentment. The resentment never becomes violent — but over decades, he passes information to rivals about the sect\'s internal politics without quite realizing what he is doing.',
        sectEffects: [
          { metric: 'safety',     delta: -15, yearsUntil: 20, description: 'Unintentional intelligence leak' },
          { metric: 'reputation', delta: -10, yearsUntil: 20, description: 'Internal politics exposed' },
        ],
      },
      expelled: {
        template: 'Leaves with nothing and tells the story to everyone he meets for the rest of his life. Not threatening — just honest about what happened. The compounded reputational damage is real.',
        sectEffects: [
          { metric: 'reputation', delta: -20, yearsUntil: 5, description: 'Story told everywhere' },
          { metric: 'safety',     delta: -5,  yearsUntil: 5, description: 'Sympathy for him, not you' },
        ],
      },
    },
  },

  {
    id: 'heavenly_dao_favorite',
    name: 'Heavenly Dao\'s Favorite',
    rarity: 'rare',
    baseAffinity: 80,
    potential: 95,
    hints: [
      'the air feels marginally more alive when he enters the room',
      'cultivation talent off every standard scale — the test equipment has to be rechecked twice',
      'every elder present feels they are making an important decision, though they cannot say why',
      'warm, approachable, and genuinely humble in a way that reads as deeply genuine',
      'he did not choose to come here — he was guided here, and he knows it',
    ],
    tells: [
      'The sect formation brightened slightly and unprompted during his cultivation test',
      'Three elders who had not agreed on anything in decades simultaneously approved of him',
    ],
    outcomes: {
      well: {
        template: 'Your sect enters a golden age. Cultivation breakthroughs accelerate. Resources appear from unexpected sources. The sect\'s formation strengthens without any additions. For three hundred years, your sect is the center of heaven\'s attention.',
        sectEffects: [
          { metric: 'power',      delta: 50, yearsUntil: 10, description: 'Golden age begins' },
          { metric: 'wealth',     delta: 40, yearsUntil: 10, description: 'Heaven\'s blessing on resources' },
          { metric: 'reputation', delta: 45, yearsUntil: 10, description: 'Center of the cultivation world' },
          { metric: 'safety',     delta: 40, yearsUntil: 10, description: 'Heaven\'s protection' },
        ],
      },
      ignored: {
        template: 'Heaven\'s blessings leave with him. The sect is not punished — it simply returns to ordinary. The contrast is felt for generations.',
        sectEffects: [
          { metric: 'power',      delta: -10, yearsUntil: 5, description: 'Back to ordinary' },
          { metric: 'reputation', delta: -10, yearsUntil: 5, description: 'The moment missed' },
        ],
      },
      poorly: {
        template: 'Heaven does not forget. Tribulations intensify for every disciple. Opportunities vanish as they appear. Three hundred years of slow, inexplicable decline.',
        sectEffects: [
          { metric: 'power',      delta: -35, yearsUntil: 5,  description: 'Tribulations intensify' },
          { metric: 'wealth',     delta: -30, yearsUntil: 5,  description: 'Resources dry up' },
          { metric: 'reputation', delta: -25, yearsUntil: 5,  description: 'Heaven-cursed reputation' },
          { metric: 'safety',     delta: -30, yearsUntil: 5,  description: 'Heaven itself opposes' },
        ],
      },
      expelled: {
        template: 'Heaven takes it personally. Every disciple\'s next heavenly tribulation is two tiers more powerful than it should be. The sect\'s formation cracks unprovoked. Rivals wonder what your sect did to deserve it.',
        sectEffects: [
          { metric: 'power',      delta: -50, yearsUntil: 1, description: 'Heaven\'s wrath' },
          { metric: 'safety',     delta: -50, yearsUntil: 1, description: 'Tribulations maximized' },
          { metric: 'reputation', delta: -40, yearsUntil: 1, description: 'Visibly heaven-opposed' },
          { metric: 'wealth',     delta: -35, yearsUntil: 1, description: 'All fortune withdrawn' },
        ],
      },
    },
  },

  // ── SECRET TWISTS ─────────────────────────────────────────────────────────────
  {
    id: 'the_janitor',
    name: 'Ancient Ancestor in Disguise',
    rarity: 'secret',
    baseAffinity: 40,
    potential: 100,
    hints: [
      'elderly, clearly has no cultivation — applies for a servant or groundskeeper position',
      'moves through the sect grounds with the casual familiarity of someone who has been here before',
      'occasionally corrects the formation\'s arrangement while sweeping as if out of habit',
      'the sect\'s spirit beasts acknowledge him first',
      'his eyes are the oldest thing in the building',
    ],
    tells: [
      'Called the sect\'s mountain by a name no living person should know',
      'Fixed a 300-year-old formation flaw in passing, without comment',
    ],
    outcomes: {
      well: {
        template: 'Reveals himself. He was testing the sect\'s character. He has been watching for three hundred years from a higher plane and found reason to invest once more. The inheritance he leaves transforms the sect into a power that lasts ten thousand years.',
        sectEffects: [
          { metric: 'power',      delta: 50, yearsUntil: 0,  description: 'Ancient ancestor revealed — full inheritance' },
          { metric: 'reputation', delta: 50, yearsUntil: 0,  description: 'Ancestor endorsed publicly' },
          { metric: 'safety',     delta: 50, yearsUntil: 0,  description: 'Higher-plane protection' },
          { metric: 'wealth',     delta: 40, yearsUntil: 0,  description: 'Ancient treasury unsealed' },
        ],
      },
      ignored: {
        template: 'Leaves quietly. The sect never knows it failed the test. Some formations work slightly better for a generation, then return to normal.',
        sectEffects: [
          { metric: 'power', delta: 5, yearsUntil: 5, description: 'Brief formation improvement' },
        ],
      },
      poorly: {
        template: 'Leaves disappointed. Three sect formations quietly degrade in the following years, as though something was maintaining them and stopped.',
        sectEffects: [
          { metric: 'safety',     delta: -15, yearsUntil: 5, description: 'Formations unmaintained' },
          { metric: 'power',      delta: -10, yearsUntil: 5, description: 'Hidden support withdrawn' },
        ],
      },
      expelled: {
        template: 'He is briefly saddened. The sect\'s core formation stops working correctly the following month. No one ever determines why.',
        sectEffects: [
          { metric: 'safety',     delta: -30, yearsUntil: 1, description: 'Core formation fails' },
          { metric: 'power',      delta: -20, yearsUntil: 1, description: 'Vulnerable without formation' },
          { metric: 'reputation', delta: -15, yearsUntil: 1, description: 'Visibly weakened' },
        ],
      },
    },
  },

  {
    id: 'the_beggar',
    name: 'Future Emperor',
    rarity: 'secret',
    baseAffinity: 30,
    potential: 97,
    hints: [
      'ragged clothes, no formal cultivation training, arrived on foot from far away',
      'the kind of presence that fills a room with nothing visible to explain it',
      'speaks to elders and servants with the same directness — no social calibration',
      'has eaten once in three days and does not mention it',
      'his eyes suggest he has already decided something about each person in the room',
    ],
    tells: [
      'Three applicants with higher cultivation bases instinctively avoided making eye contact with him',
      'Said something brief that made the most senior elder in the room go quiet for a long moment',
    ],
    outcomes: {
      well: {
        template: 'He remembers. Thirty years later, as the sect is facing a tribunal that could destroy it, an imperial edict arrives. The emperor recalls a kindness from a sect that saw him when no one else did.',
        sectEffects: [
          { metric: 'safety',     delta: 45, yearsUntil: 30, description: 'Imperial protection granted' },
          { metric: 'reputation', delta: 40, yearsUntil: 30, description: 'Emperor\'s chosen sect' },
          { metric: 'wealth',     delta: 30, yearsUntil: 30, description: 'Imperial resource grants' },
          { metric: 'power',      delta: 25, yearsUntil: 30, description: 'Imperial-backed expansion' },
        ],
      },
      ignored: {
        template: 'He does not remember your sect in particular. Not a mistake — you were simply unremarkable to him. The imperial court has no opinion of you.',
        sectEffects: [
          { metric: 'safety', delta: 0, yearsUntil: 0, description: 'Not noticed' },
        ],
      },
      poorly: {
        template: 'He remembers. Forty years later, your sect is the subject of three consecutive audits. No single act destroys you — just endless administrative pressure applied from above.',
        sectEffects: [
          { metric: 'safety',     delta: -25, yearsUntil: 30, description: 'Imperial harassment' },
          { metric: 'wealth',     delta: -20, yearsUntil: 30, description: 'Tax and audit pressure' },
          { metric: 'reputation', delta: -15, yearsUntil: 30, description: 'Imperial disapproval known' },
        ],
      },
      expelled: {
        template: 'He remembers vividly. Your sect is formally blacklisted from imperial territories within two years of his coronation. No resources cross your borders without his permission.',
        sectEffects: [
          { metric: 'safety',     delta: -40, yearsUntil: 30, description: 'Imperial embargo' },
          { metric: 'wealth',     delta: -35, yearsUntil: 30, description: 'Trade routes closed' },
          { metric: 'reputation', delta: -30, yearsUntil: 30, description: 'Imperial enemy' },
        ],
      },
    },
  },

  {
    id: 'the_crybaby',
    name: 'Future Sword Saint',
    rarity: 'secret',
    baseAffinity: 55,
    potential: 94,
    hints: [
      'cried briefly in the waiting area — no one knows why, including him',
      'emotional, sensitive, apologizes frequently',
      'sword affinity that experienced elders might sense if they bother to look',
      'cultivation talent appears average because he is not trying to perform',
      'clearly has been laughed at before, has learned to absorb it quietly',
    ],
    tells: [
      'His hand unconsciously went to an empty scabbard three times during the interview',
      'The training sword in the corner leaned toward him when he walked past',
    ],
    outcomes: {
      well: {
        template: 'You give him the thing he needed most: someone who did not laugh. He dedicates his life to the sword with the intensity of someone who has something to prove. He becomes the greatest sword practitioner of the age and names your sect\'s location in every formal introduction.',
        sectEffects: [
          { metric: 'power',      delta: 45, yearsUntil: 50, description: 'Sword Saint claimed your sect as home' },
          { metric: 'reputation', delta: 40, yearsUntil: 50, description: 'Associated with a legend' },
          { metric: 'safety',     delta: 30, yearsUntil: 50, description: 'No one attacks the Sword Saint\'s sect' },
        ],
      },
      ignored: {
        template: 'Trains elsewhere. Becomes the Sword Saint anyway. Your sect is not mentioned. Not targeted. Simply absent from his story.',
        sectEffects: [
          { metric: 'power', delta: 0, yearsUntil: 0, description: 'Not part of his story' },
        ],
      },
      poorly: {
        template: 'Does not train any less hard — but when asked where his path began, he describes your sect\'s contempt as the ember that lit the fire. Your name appears in the cautionary chapters of sword cultivation manuals.',
        sectEffects: [
          { metric: 'reputation', delta: -25, yearsUntil: 40, description: 'Used as a villain in his story' },
          { metric: 'safety',     delta: -10, yearsUntil: 40, description: 'Every swordsman knows the story' },
        ],
      },
      expelled: {
        template: 'He cried leaving. He did not cry again for fifty years. When he returned, it was not for revenge — simply to test a technique. The outer sect gate did not survive the test.',
        sectEffects: [
          { metric: 'safety',     delta: -35, yearsUntil: 50, description: 'Casual demonstration of power' },
          { metric: 'reputation', delta: -30, yearsUntil: 50, description: 'The sect a legend used for target practice' },
        ],
      },
    },
  },

  {
    id: 'the_rejected_applicant',
    name: 'The One They All Missed',
    rarity: 'secret',
    baseAffinity: 20,
    potential: 96,
    hints: [
      'talent appears completely useless at first assessment — earth or wood affinity that reads as inert',
      'rejected by three other sects this month alone',
      'his application is technically disqualified before the interview begins',
      'says very little, does not argue, clearly expects rejection',
      'something about him makes the room feel slightly steadier',
    ],
    tells: [
      'The sect\'s spirit measuring stone gave a reading so low the elder assumed it was broken and retested three times',
      'Every disciple who interacted with him during the wait became calmer without knowing why',
    ],
    outcomes: {
      well: {
        template: 'The talent everyone missed was a foundation-type constitution so rare it does not appear in standard cultivation texts. He becomes the most stable, most enduring cultivator of his generation. Not the flashiest — but the last one standing after every cataclysm. He becomes the sect\'s foundation itself.',
        sectEffects: [
          { metric: 'power',      delta: 40, yearsUntil: 80, description: 'Endures when others fall' },
          { metric: 'safety',     delta: 45, yearsUntil: 80, description: 'The sect\'s immovable pillar' },
          { metric: 'reputation', delta: 25, yearsUntil: 80, description: 'Sect that saw what no one else did' },
        ],
      },
      ignored: {
        template: 'Leaves without complaint. Becomes the strongest cultivator of the generation at a rival sect that also almost rejected him. Your elders read the announcement and remember the quiet applicant.',
        sectEffects: [
          { metric: 'power',      delta: -10, yearsUntil: 60, description: 'Rival gains generational talent' },
          { metric: 'reputation', delta: -10, yearsUntil: 60, description: 'The sect everyone knows almost had him' },
        ],
      },
      poorly: {
        template: 'Left, trained elsewhere, became dominant. He does not target your sect. But when he passes through the region, he does not protect it either. His absence is a kind of consequence.',
        sectEffects: [
          { metric: 'safety',     delta: -15, yearsUntil: 60, description: 'Not under his protection' },
          { metric: 'reputation', delta: -15, yearsUntil: 60, description: 'A missed opportunity, publicly known' },
        ],
      },
      expelled: {
        template: 'You chose to make it memorable. He chose not to forget. Three hundred years later, the only sect he refuses to acknowledge — in any archive, record, or alliance — is yours.',
        sectEffects: [
          { metric: 'reputation', delta: -30, yearsUntil: 60, description: 'Erased from his history' },
          { metric: 'safety',     delta: -20, yearsUntil: 60, description: 'Not protected. Ever.' },
          { metric: 'power',      delta: -15, yearsUntil: 60, description: 'Rivals receive his support' },
        ],
      },
    },
  },
]

// ── Sect presets ──────────────────────────────────────────────────────────────
export interface SectPreset {
  id:          string
  name:        string
  tagline:     string
  description: string
  startingStats: { power: number; wealth: number; reputation: number; safety: number }
  rarityWeights: Record<Rarity, number>  // relative spawn weights
  poolBias:    string[]   // archetype IDs that appear more frequently
  flavor:      string     // injected into Claude's system prompt for tone
}

export const SECT_PRESETS: SectPreset[] = [
  {
    id: 'declining',
    name: 'The Hollow Peak Sect',
    tagline: 'A once-proud sect in desperate decline.',
    description: 'Three elders remain. The spirit vein is weakening. You will accept almost anyone — which means almost anything might walk through your door.',
    startingStats: { power: 30, wealth: 25, reputation: 35, safety: 40 },
    rarityWeights: { common: 3, uncommon: 3, rare: 2, secret: 2 },
    poolBias: ['demon_spy', 'cursed_disciple', 'chosen_protagonist', 'the_janitor'],
    flavor: 'The sect is desperate. Elders are pragmatic, slightly reckless. They need anyone with promise.',
  },
  {
    id: 'elite',
    name: 'The Iron Heaven Sect',
    tagline: 'Prestige, standards, and an insufferable interview process.',
    description: 'One of the top five sects in the region. You have high standards and higher expectations. Only six spots remain this cycle.',
    startingStats: { power: 65, wealth: 60, reputation: 70, safety: 65 },
    rarityWeights: { common: 2, uncommon: 4, rare: 3, secret: 1 },
    poolBias: ['arrogant_young_master', 'future_sect_founder', 'reincarnated_immortal', 'regressor'],
    flavor: 'The sect is prestigious and selective. Elders are confident, occasionally arrogant. Standards are high.',
  },
  {
    id: 'border',
    name: 'The Blood Jade Sect',
    tagline: 'The frontier is unforgiving. So are we.',
    description: 'Your sect guards the border between the cultivation world and demon territory. Every disciple must be a fighter. Survival matters more than lineage.',
    startingStats: { power: 60, wealth: 35, reputation: 45, safety: 30 },
    rarityWeights: { common: 3, uncommon: 3, rare: 2, secret: 2 },
    poolBias: ['monster_tamer', 'beast_blood', 'demon_spy', 'regressor', 'future_weapon_saint'],
    flavor: 'The sect is military. Elders are veterans, pragmatic and direct. Combat effectiveness is paramount.',
  },
  {
    id: 'merchant',
    name: 'The Golden Confluence Hall',
    tagline: 'Everything has a price. Everything is an opportunity.',
    description: 'Half cultivation sect, half trading empire. Power here is measured in spirit stones and alliances. You recruit for talent and network, not just combat strength.',
    startingStats: { power: 40, wealth: 75, reputation: 55, safety: 50 },
    rarityWeights: { common: 3, uncommon: 3, rare: 2, secret: 2 },
    poolBias: ['fatty_merchant', 'future_auction_king', 'heavenly_doctor', 'future_alchemy_saint'],
    flavor: 'The sect values commerce and connections. Elders are shrewd and calculating. Wealth and network are the real metrics.',
  },
]

// ── Utility ───────────────────────────────────────────────────────────────────
export function pickArchetypes(preset: SectPreset, count = 8): Archetype[] {
  const weights = preset.rarityWeights
  const pool = [...ARCHETYPES]

  // Boost biased archetypes
  const biased = preset.poolBias
  const weighted: Archetype[] = []
  for (const a of pool) {
    const w = weights[a.rarity]
    const extra = biased.includes(a.id) ? 2 : 0
    for (let i = 0; i < w + extra; i++) weighted.push(a)
  }

  // Sample without replacement
  const chosen: Archetype[] = []
  const usedIds = new Set<string>()
  let attempts = 0
  while (chosen.length < count && attempts < 500) {
    const pick = weighted[Math.floor(Math.random() * weighted.length)]
    if (!usedIds.has(pick.id)) {
      chosen.push(pick)
      usedIds.add(pick.id)
    }
    attempts++
  }
  return chosen
}

export function calcSectOutcome(
  applicants: { archetypeId: string; treatment: Treatment }[],
  preset: SectPreset,
): { power: number; wealth: number; reputation: number; safety: number; title: string; summary: string } {
  const stats = { ...preset.startingStats }

  for (const { archetypeId, treatment } of applicants) {
    const arch = ARCHETYPES.find(a => a.id === archetypeId)
    if (!arch) continue
    for (const effect of arch.outcomes[treatment].sectEffects) {
      stats[effect.metric] = Math.max(0, Math.min(100, stats[effect.metric] + effect.delta))
    }
  }

  const total = stats.power + stats.wealth + stats.reputation + stats.safety
  let title = ''
  let summary = ''
  if (total >= 340) { title = 'Golden Age'; summary = 'Your sect enters an era of unprecedented prosperity.' }
  else if (total >= 270) { title = 'Rising Power'; summary = 'Your sect grows stronger with each generation.' }
  else if (total >= 200) { title = 'Stable Sect'; summary = 'Your sect endures, unremarkable but unbroken.' }
  else if (total >= 130) { title = 'In Decline'; summary = 'Your sect struggles against mounting pressures.' }
  else { title = 'On the Brink'; summary = 'Your sect teeters on the edge of dissolution.' }

  return { ...stats, title, summary }
}
