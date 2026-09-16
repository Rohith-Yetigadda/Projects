(function(){
"use strict";

"use strict";

/* ============ DATA: [id, year, title, type, universe, priority, synopsis] ============ */
const DATA = [
[1,1992,"X-Men: The Animated Series","Series","X-Men","Essential","The X-Men fight to protect a world that fears and hates them, adapting classic comic storylines for Saturday mornings."],
[2,1998,"Blade","Movie","Blade","Essential","A half-vampire hunter wages a one-man war against the undead threatening to enslave humanity."],
[3,2000,"X-Men","Movie","Fox X-Men","Essential","Mutant heroes Professor X and Magneto clash over how humanity should respond to genetic evolution."],
[4,2002,"Blade II","Movie","Blade","Essential","Blade allies with vampire forces to stop a mutant strain that threatens both species."],
[5,2002,"Spider-Man","Movie","Sony Spider-Man","Essential","Bitten by a genetically altered spider, Peter Parker becomes a hero while a scientist descends into madness as the Green Goblin."],
[6,2003,"Daredevil","Movie","Marvel / Fox","Recommended","A blind lawyer moonlights as a masked vigilante protecting Hell's Kitchen."],
[7,2003,"X2: X-Men United","Movie","Fox X-Men","Essential","The X-Men team with old enemies to stop a military strike meant to eliminate mutants."],
[8,2003,"Hulk","Movie","Hulk","Recommended","A scientist's gamma-radiation accident unleashes a rage-fueled alter ego tied to his father's experiments."],
[9,2004,"The Punisher","Movie","Marvel / Sony","Recommended","An undercover agent turns vigilante after his family is murdered by the mob."],
[10,2004,"Spider-Man 2","Movie","Sony Spider-Man","Essential","Peter Parker struggles to balance his personal life with his duties as Spider-Man while facing Doctor Octopus."],
[11,2004,"Blade: Trinity","Movie","Blade","Recommended","Blade faces Dracula himself while a new generation of hunters joins his fight."],
[12,2005,"Elektra","Movie","Marvel / Fox","Recommended","An assassin is hired to kill a man and his daughter, then chooses to protect them instead."],
[13,2005,"Fantastic Four","Movie","Fantastic Four","Essential","Four astronauts gain extraordinary powers from cosmic radiation and must stop a former colleague turned villain."],
[14,2006,"X-Men: The Last Stand","Movie","Fox X-Men","Essential","A so-called mutant 'cure' divides the X-Men as Jean Grey's dark side awakens."],
[15,2006,"Blade: The Series","Series","Blade","Optional","A spin-off series following a new vampire hunter continuing Blade's war on the undead."],
[16,2007,"Ghost Rider","Movie","Ghost Rider","Recommended","A stunt motorcyclist who sold his soul to the devil becomes a flame-skulled bounty hunter of evil."],
[17,2007,"Spider-Man 3","Movie","Sony Spider-Man","Essential","An alien symbiote amplifies Peter Parker's darker impulses as new enemies emerge."],
[18,2007,"Fantastic Four: Rise of the Silver Surfer","Movie","Fantastic Four","Recommended","The Fantastic Four confront a cosmic herald warning of a coming planetary threat."],
[19,2008,"Iron Man","Movie","MCU","Essential","Weapons manufacturer Tony Stark builds a powered suit of armor after a life-changing capture, launching a new era of heroes."],
[20,2008,"The Incredible Hulk","Movie","MCU","Essential","Bruce Banner evades a military manhunt while searching for a cure to his gamma-fueled transformation."],
[21,2008,"Punisher: War Zone","Movie","Punisher","Recommended","Frank Castle continues his brutal one-man crusade against organized crime."],
[22,2009,"X-Men Origins: Wolverine","Movie","Fox X-Men","Recommended","Wolverine's violent past and a secret weapons program come back to haunt him."],
[23,2010,"Iron Man 2","Movie","MCU","Essential","Tony Stark faces a vengeful rival and the toxic side effects of his own arc reactor."],
[24,2011,"Thor","Movie","MCU","Essential","An arrogant Asgardian prince is exiled to Earth, where he must learn humility to reclaim his hammer."],
[25,2011,"X-Men: First Class","Movie","Fox X-Men","Essential","A young Charles Xavier and Erik Lehnsherr form the X-Men amid the Cuban Missile Crisis, and their friendship starts to fracture."],
[26,2011,"Captain America: The First Avenger","Movie","MCU","Essential","A frail volunteer is transformed into a super-soldier to fight Hydra during World War II."],
[27,2011,"Ghost Rider: Spirit of Vengeance","Movie","Ghost Rider","Recommended","Johnny Blaze is recruited to protect a boy targeted by dark forces."],
[28,2012,"The Avengers","Movie","MCU","Essential","Earth's mightiest heroes assemble to stop Loki and an alien army from conquering the planet."],
[29,2012,"The Amazing Spider-Man","Movie","Sony Spider-Man","Essential","Peter Parker uncovers his parents' past while confronting a scientist who transforms into a reptilian monster."],
[30,2013,"Iron Man 3","Movie","MCU","Essential","Tony Stark battles a terrorist mastermind while grappling with anxiety after the events of New York."],
[31,2013,"The Wolverine","Movie","Fox X-Men","Essential","Logan travels to Japan and is drawn into a family conflict that tests his immortality."],
[32,2013,"Thor: The Dark World","Movie","MCU","Essential","Thor must stop an ancient race of Dark Elves from plunging the universe into darkness."],
[33,2013,"Agents of S.H.I.E.L.D. \u2014 Season 1","Series","MCU-adjacent","Recommended","A team of agents investigates strange, dangerous phenomena in the aftermath of the Battle of New York."],
[34,2014,"Captain America: The Winter Soldier","Movie","MCU","Essential","Steve Rogers uncovers a conspiracy within S.H.I.E.L.D. while facing a lethal assassin from his past."],
[35,2014,"The Amazing Spider-Man 2","Movie","Sony Spider-Man","Essential","Spider-Man faces Electro and old friend Harry Osborn as new threats emerge in New York."],
[36,2014,"X-Men: Days of Future Past","Movie","Fox X-Men","Essential","The X-Men send Wolverine's mind into the past to prevent a bleak future of mutant extermination."],
[37,2014,"Guardians of the Galaxy","Movie","MCU","Essential","A ragtag band of misfits and outlaws band together to stop a fanatic from destroying a planet."],
[38,2014,"Agents of S.H.I.E.L.D. \u2014 Season 2","Series","MCU-adjacent","Recommended","The team investigates the Inhuman gene while navigating a fractured S.H.I.E.L.D."],
[39,2015,"Agent Carter \u2014 Season 1","Series","MCU-adjacent","Recommended","Peggy Carter works to clear Howard Stark's name while facing sexism within a post-war intelligence agency."],
[40,2015,"Daredevil \u2014 Season 1","Series","Defenders / MCU","Essential","Matt Murdock begins his double life as a blind lawyer and vigilante taking on a rising crime boss."],
[41,2015,"Avengers: Age of Ultron","Movie","MCU","Essential","Tony Stark's peacekeeping program spirals into an artificial intelligence bent on humanity's extinction."],
[42,2015,"Ant-Man","Movie","MCU","Essential","A reformed thief dons a size-shifting suit to pull off a high-stakes heist."],
[43,2015,"Jessica Jones \u2014 Season 1","Series","Defenders / MCU","Essential","A hard-drinking private investigator with super-strength is haunted by a mind-controlling abuser."],
[44,2015,"Agents of S.H.I.E.L.D. \u2014 Season 3","Series","MCU-adjacent","Recommended","The team hunts a mysterious Inhuman prophecy while confronting an ancient alien threat."],
[45,2016,"Deadpool","Movie","Fox X-Men","Essential","A wisecracking mercenary gains regenerative powers and hunts the man who disfigured him."],
[46,2016,"Daredevil \u2014 Season 2","Series","Defenders / MCU","Essential","Matt Murdock's world is upended by the arrivals of the Punisher and Elektra."],
[47,2016,"Captain America: Civil War","Movie","MCU","Essential","The Avengers split over government oversight, pitting former allies against each other."],
[48,2016,"X-Men: Apocalypse","Movie","Fox X-Men","Recommended","The X-Men face their greatest threat yet: an ancient, godlike mutant awakened after millennia."],
[49,2016,"Luke Cage \u2014 Season 1","Series","Defenders / MCU","Essential","A bulletproof man reluctantly becomes Harlem's protector against a corrupt kingpin."],
[50,2016,"Doctor Strange","Movie","MCU","Essential","A brilliant but arrogant surgeon discovers the mystic arts after a career-ending accident."],
[51,2016,"Agent Carter \u2014 Season 2","Series","MCU-adjacent","Recommended","Peggy Carter relocates to Los Angeles to investigate a mysterious substance tied to a new threat."],
[52,2016,"Agents of S.H.I.E.L.D. \u2014 Season 4","Series","MCU-adjacent","Recommended","The team confronts Ghost Rider, a sinister AI, and a virtual reality crisis across a shifting season."],
[53,2017,"Logan","Movie","Fox X-Men","Essential","An aging Wolverine cares for an ailing Professor X while protecting a young mutant with a familiar power."],
[54,2017,"Legion \u2014 Season 1","Series","Fox X-Men","Recommended","A troubled mutant struggles to determine what's real amid his extraordinary and dangerous psychic powers."],
[55,2017,"Iron Fist \u2014 Season 1","Series","Defenders / MCU","Recommended","A presumed-dead heir returns to New York wielding a mystical martial arts power."],
[56,2017,"The Defenders \u2014 Season 1","Series","Defenders / MCU","Essential","Daredevil, Jessica Jones, Luke Cage, and Iron Fist team up against a secretive organization threatening New York."],
[57,2017,"The Punisher \u2014 Season 1","Series","Defenders / MCU","Essential","Frank Castle uncovers a conspiracy connected to his family's murder."],
[58,2017,"Guardians of the Galaxy Vol. 2","Movie","MCU","Essential","The Guardians confront Star-Lord's mysterious father while navigating fractures within their found family."],
[59,2017,"Spider-Man: Homecoming","Movie","MCU","Essential","A teenage Peter Parker balances high school with his growing responsibilities as Spider-Man under Tony Stark's mentorship."],
[60,2017,"Thor: Ragnarok","Movie","MCU","Essential","Thor is stripped of his powers and must escape an alien world to stop Ragnarok."],
[61,2017,"Inhumans \u2014 Season 1","Series","Marvel Television","Optional","The royal family of a hidden Inhuman city battles a coup that forces them to Earth."],
[62,2017,"Runaways \u2014 Season 1","Series","Marvel Television","Recommended","A group of teenagers discovers their parents are part of a secret criminal organization."],
[63,2017,"The Gifted \u2014 Season 1","Series","Fox X-Men","Recommended","A suburban family goes on the run after discovering their children are mutants."],
[64,2017,"Agents of S.H.I.E.L.D. \u2014 Season 5","Series","MCU-adjacent","Recommended","The team is transported to a bleak future before racing to prevent Earth's destruction."],
[65,2018,"Black Panther","Movie","MCU","Essential","T'Challa returns home to Wakanda to claim the throne and defend it from a vengeful challenger."],
[66,2018,"Jessica Jones \u2014 Season 2","Series","Defenders / MCU","Recommended","Jessica investigates the origins of her powers and the shadowy organization behind them."],
[67,2018,"Avengers: Infinity War","Movie","MCU","Essential","The Avengers race to stop Thanos from collecting all six Infinity Stones."],
[68,2018,"Cloak & Dagger \u2014 Season 1","Series","Marvel Television","Recommended","Two teenagers bonded by a mysterious accident discover they share light and darkness-based powers."],
[69,2018,"Deadpool 2","Movie","Fox X-Men","Essential","Deadpool forms a team of mutants to protect a troubled boy from a time-traveling soldier."],
[70,2018,"Luke Cage \u2014 Season 2","Series","Defenders / MCU","Recommended","Luke Cage battles a new gang war while confronting his own family's dark legacy."],
[71,2018,"Iron Fist \u2014 Season 2","Series","Defenders / MCU","Recommended","Danny Rand fights to protect New York as old rivals and new threats emerge."],
[72,2018,"Ant-Man and the Wasp","Movie","MCU","Essential","Scott Lang teams with Hope van Dyne to rescue her mother from the quantum realm."],
[73,2018,"Venom","Movie","Sony Spider-Man Universe","Recommended","A journalist bonds with an alien symbiote that gives him violent new powers."],
[74,2018,"Daredevil \u2014 Season 3","Series","Defenders / MCU","Essential","Matt Murdock returns from presumed death to face Wilson Fisk's manipulation of the FBI."],
[75,2018,"Spider-Man: Into the Spider-Verse","Movie","Sony Animation","Essential","Miles Morales discovers he's one of many Spider-heroes pulled together from parallel universes."],
[76,2018,"The Gifted \u2014 Season 2","Series","Fox X-Men","Recommended","The Mutant Underground escalates its conflict with a government hunting mutants."],
[77,2019,"The Punisher \u2014 Season 2","Series","Defenders / MCU","Recommended","Frank Castle is drawn back into violence while protecting a young woman from a fanatical hitman."],
[78,2019,"Captain Marvel","Movie","MCU","Essential","A Kree warrior discovers her forgotten past and true power as an Earth-born hero."],
[79,2019,"Avengers: Endgame","Movie","MCU","Essential","The surviving Avengers attempt a time heist to undo Thanos's snap."],
[80,2019,"Dark Phoenix","Movie","Fox X-Men","Recommended","Jean Grey's powers spiral out of control after a cosmic accident, threatening everyone she loves."],
[81,2019,"Jessica Jones \u2014 Season 3","Series","Defenders / MCU","Recommended","Jessica confronts a serial killer whose methods mirror her own moral compromises."],
[82,2019,"Spider-Man: Far From Home","Movie","MCU","Essential","Peter Parker faces the illusionist Mysterio while grieving Tony Stark's death on a school trip to Europe."],
[83,2019,"Runaways \u2014 Season 2","Series","Marvel Television","Recommended","The Runaways continue evading their villainous parents while uncovering more of their plans."],
[84,2019,"Cloak & Dagger \u2014 Season 2","Series","Marvel Television","Recommended","Tandy and Tyrone's powers grow more dangerous as new threats emerge in New Orleans."],
[85,2019,"Legion \u2014 Season 2","Series","Fox X-Men","Recommended","David Haller searches for the parasitic entity threatening his sanity and those around him."],
[86,2019,"Runaways \u2014 Season 3","Series","Marvel Television","Recommended","The Runaways face a demonic threat while trying to rebuild trust among themselves."],
[87,2019,"Legion \u2014 Season 3","Series","Fox X-Men","Recommended","David Haller's war against Farouk reaches its time-bending conclusion."],
[88,2019,"Agents of S.H.I.E.L.D. \u2014 Season 6","Series","MCU-adjacent","Optional","The team searches deep space for a missing colleague while a new alien threat emerges."],
[89,2020,"The New Mutants","Movie","Fox X-Men","Recommended","A group of young mutants held in a secret facility must confront the darker sides of their powers."],
[90,2020,"Agents of S.H.I.E.L.D. \u2014 Season 7","Series","MCU-adjacent","Optional","The team time-travels through history to stop the Chronicoms from erasing S.H.I.E.L.D."],
[91,2021,"WandaVision","Series","MCU","Essential","Wanda Maximoff and Vision live an idyllic sitcom life that hides a deeper, grief-driven mystery."],
[92,2021,"The Falcon and the Winter Soldier","Series","MCU","Essential","Sam Wilson and Bucky Barnes confront a global super-soldier crisis and the legacy of the shield."],
[93,2021,"Loki \u2014 Season 1","Series","MCU","Essential","A variant Loki is recruited by a bureaucratic agency that polices the timeline."],
[94,2021,"Black Widow","Movie","MCU","Recommended","Natasha Romanoff confronts her past as a Red Room assassin and the family she left behind."],
[95,2021,"What If\u2026? \u2014 Season 1","Series","MCU Animation","Recommended","An animated anthology explores alternate timelines where pivotal Marvel moments unfold differently."],
[96,2021,"Shang-Chi and the Legend of the Ten Rings","Movie","MCU","Essential","Shang-Chi is pulled back into his father's secretive criminal organization built around ten mystical rings."],
[97,2021,"Eternals","Movie","MCU","Recommended","A group of ancient immortal aliens reunite to protect Earth from their monstrous counterparts."],
[98,2021,"Hawkeye","Series","MCU","Essential","Clint Barton mentors a young archer while a figure from his past as Ronin resurfaces."],
[99,2021,"Spider-Man: No Way Home","Movie","MCU / Sony","Essential","Peter Parker's identity reveal shatters the multiverse, pulling in villains from other realities."],
[100,2022,"Moon Knight","Series","MCU","Recommended","A man with dissociative identity disorder discovers he's the avatar of an Egyptian moon god."],
[101,2022,"Doctor Strange in the Multiverse of Madness","Movie","MCU","Essential","Doctor Strange journeys across realities to protect a girl who can traverse the multiverse."],
[102,2022,"Ms. Marvel","Series","MCU","Recommended","A Jersey City teenager discovers she has cosmic powers tied to her family's hidden history."],
[103,2022,"Thor: Love and Thunder","Movie","MCU","Essential","Thor seeks inner peace but must confront a god-killer targeting deities across the universe."],
[104,2022,"I Am Groot \u2014 Season 1","Series","MCU Animation","Optional","A series of animated shorts follows a young Groot's mischievous early days aboard the Milano."],
[105,2022,"She-Hulk: Attorney at Law","Series","MCU","Recommended","Lawyer Jennifer Walters gains gamma-powered strength and juggles superhero life with her legal career."],
[106,2022,"Werewolf by Night","Special","MCU","Recommended","Monster hunters compete in a deadly contest to inherit a powerful relic."],
[107,2022,"Black Panther: Wakanda Forever","Movie","MCU","Essential","Wakanda mourns its king while defending itself from a hidden underwater nation."],
[108,2022,"The Guardians of the Galaxy Holiday Special","Special","MCU","Recommended","The Guardians attempt to give Peter Quill the perfect Christmas gift."],
[109,2023,"Ant-Man and the Wasp: Quantumania","Movie","MCU","Essential","The Lang-van Dyne family is pulled into the Quantum Realm and confronts the time-variant Kang."],
[110,2023,"Guardians of the Galaxy Vol. 3","Movie","MCU","Essential","The Guardians go on a mission to save Rocket, confronting his traumatic origins."],
[111,2023,"Secret Invasion","Series","MCU","Recommended","Nick Fury uncovers a decades-long Skrull infiltration of Earth's institutions."],
[112,2023,"I Am Groot \u2014 Season 2","Series","MCU Animation","Optional","More animated shorts follow young Groot's adventures and mishaps."],
[113,2023,"Loki \u2014 Season 2","Series","MCU","Essential","Loki fights to stabilize a collapsing timeline and save the TVA from unraveling."],
[114,2023,"The Marvels","Movie","MCU","Recommended","Carol Danvers, Kamala Khan, and Monica Rambeau have their powers accidentally entangled across the cosmos."],
[115,2023,"What If\u2026? \u2014 Season 2","Series","MCU Animation","Recommended","The animated anthology returns with more diverging timelines across the multiverse."],
[116,2024,"Echo","Series","MCU","Recommended","Maya Lopez returns to her hometown roots to confront her past with the Kingpin's criminal empire."],
[117,2024,"X-Men '97 \u2014 Season 1","Series","Marvel Animation / X-Men","Essential","A revival of the beloved 1990s animated series, following the X-Men after Professor X's apparent death."],
[118,2024,"Deadpool & Wolverine","Movie","Marvel Multiverse","Essential","Deadpool recruits a reluctant Wolverine variant on a mission that threatens to unravel the multiverse's sacred timeline."],
[119,2024,"Agatha All Along","Series","MCU","Recommended","A powerless witch assembles a coven to walk a mysterious road of trials for her magic back."],
[120,2024,"What If\u2026? \u2014 Season 3","Series","MCU Animation","Recommended","The multiverse anthology continues with new twists on familiar Marvel stories."],
[121,2025,"Your Friendly Neighborhood Spider-Man \u2014 Season 1","Series","Marvel Animation / Spider-Man","Recommended","An animated series follows a teenage Peter Parker early in his Spider-Man journey."],
[122,2025,"Captain America: Brave New World","Movie","MCU","Essential","Sam Wilson takes up the shield fully and faces an international incident tied to a new Super-Soldier serum."],
[123,2025,"Daredevil: Born Again \u2014 Season 1","Series","MCU / Defenders","Essential","Matt Murdock and Wilson Fisk's rivalry reignites as Fisk rises to political power in New York."],
[124,2025,"Thunderbolts*","Movie","MCU","Essential","A team of morally gray antiheroes is thrown together on a covert mission that becomes something bigger."],
[125,2025,"Ironheart","Series","MCU","Recommended","Genius inventor Riri Williams builds her own suit of armor and is pulled into a dangerous new conflict."],
[126,2025,"The Fantastic Four: First Steps","Movie","MCU / Fantastic Four","Essential","Marvel's first family debuts in a retro-futuristic setting, defending Earth from a cosmic threat."],
[127,2025,"Eyes of Wakanda","Series","MCU Animation","Recommended","An animated series follows Wakandan warriors on covert missions throughout history."],
[128,2025,"Marvel Zombies \u2014 Season 1","Series","MCU Animation","Optional","An animated series set in a zombie-infected corner of the multiverse follows survivors fighting infected heroes."],
[129,2026,"Wonder Man \u2014 Season 1","Series","MCU","Recommended","A stuntman turned reluctant hero navigates Hollywood and his own budding powers."],
[130,2026,"Daredevil: Born Again \u2014 Season 2","Series","MCU / Defenders","Essential","Matt Murdock's fight against Wilson Fisk's rule over New York continues."],
[131,2026,"The Punisher: One Last Kill","Special","MCU / Defenders","Recommended","Frank Castle returns for one more mission that tests everything he has left."],
[132,2026,"Spider-Noir \u2014 Season 1","Series","Sony Spider-Man Universe","Recommended","A hardboiled, noir-styled Spider-Man investigates crime in a stylized 1930s New York."],
[133,2026,"X-Men '97 \u2014 Season 2","Series","Marvel Animation / X-Men","Essential","The animated revival continues the X-Men's fight against new and returning threats."],
[134,2026,"Spider-Man: Brand New Day","Movie","MCU / Sony","Essential","The next MCU Spider-Man chapter finds Peter Parker navigating a changed New York and status quo."]
];
const UPCOMING = [
  { date:"Oct 2026", title:"VisionQuest", universe:"MCU", synopsis:"A series centered on Vision as he reconstructs his identity and memories." },
  { date:"Dec 2026", title:"Avengers: Doomsday", universe:"MCU / Multiverse", synopsis:"A new lineup of Avengers unites to face Victor von Doom." },
  { date:"Dec 2027", title:"Avengers: Secret Wars", universe:"MCU / Multiverse", synopsis:"The multiverse's fate converges in Marvel's next two-part Avengers event." }
];
const TOTAL = DATA.length;
const ESSENTIAL_TOTAL = DATA.filter(d=>d[5]==='Essential').length;

function family(u){
  if(u.indexOf("MCU")!==-1) return "mcu";
  if(u.indexOf("X-Men")!==-1) return "xmen";
  if(u.indexOf("Spider-Man")!==-1) return "spidey";
  if(u==="Sony Animation") return "spidey";
  if(u.indexOf("Blade")!==-1) return "blade";
  return "other";
}
const FAM_LABEL = { mcu:"MCU", xmen:"X-Men", spidey:"Spider-Verse", blade:"Blade", other:"Other" };
const FAM_COLOR = { mcu:"#e8393a", xmen:"#d3a12c", spidey:"#3f7fe0", blade:"#9b6bf2", other:"#6b7280" };
const FAM_COLOR2 = { mcu:"#ff8a3d", xmen:"#8a5cff", spidey:"#7fd8ff", blade:"#ff6bd6", other:"#9ca3af" };
const THEMES = [ {id:"",color:"#e8393a"}, {id:"cosmic",color:"#3f7fe0"}, {id:"mystic",color:"#9b6bf2"}, {id:"vibranium",color:"#d3a12c"} ];

const TYPE_ICON = {
  Movie:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="14" rx="1.5"/><path d="M7 6l2.5-3h5L12 6"/></svg>',
  Series:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="13" rx="1.5"/><path d="M8 21h8"/></svg>',
  Special:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.6 6.6L21 11l-6.4 2.4L12 20l-2.6-6.6L3 11l6.4-2.4z"/></svg>'
};
const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
const EXT_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';
const CHECK_ICON = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2l-3.5-3.5L4 14.2 9 19.2 20 8.2l-1.5-1.5z"/></svg>';

/* ============ STATE ============ */
const state = { watched:new Set(), search:"", fam:"all", ty:"all", pr:"all", hideWatched:false, theme:"" };
const REDUCE_MOTION = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============ STORAGE ============ */
async function loadState(){
  try{
    if(window.storage){
      const res = await window.storage.get('marvel-tracker-v4', false);
      if(res && res.value){
        const p = JSON.parse(res.value);
        if(p.watched) state.watched = new Set(p.watched);
        if(p.theme !== undefined) state.theme = p.theme;
      }
    }
  }catch(e){}
}
async function saveState(){
  try{
    if(window.storage){
      await window.storage.set('marvel-tracker-v4', JSON.stringify({ watched:Array.from(state.watched), theme:state.theme }), false);
    }
  }catch(e){}
}

/* ============ HELPERS ============ */
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function filteredData(){
  return DATA.filter(item=>{
    const [id,year,title,ty,universe,pr] = item;
    if(state.search && title.toLowerCase().indexOf(state.search)===-1) return false;
    if(state.fam!=='all' && family(universe)!==state.fam) return false;
    if(state.ty!=='all' && ty!==state.ty) return false;
    if(state.pr!=='all' && pr!==state.pr) return false;
    return true;
  });
}
function posterArtHTML(fam, id){
  const c1 = FAM_COLOR[fam], c2 = FAM_COLOR2[fam];
  const seed = id % 4;
  const patterns = [
    'repeating-linear-gradient(115deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px)',
    'repeating-linear-gradient(65deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px)',
    'repeating-radial-gradient(circle at 50% 40%, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 16px)',
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 2px, transparent 2px, transparent 18px)'
  ];
  return '<div style="position:absolute;inset:0;background:'+
    'radial-gradient(circle at 25% 15%, '+c2+' 0%, transparent 45%), '+
    'radial-gradient(circle at 80% 85%, '+c1+' 0%, transparent 55%), '+
    'linear-gradient(160deg, '+c1+', #0a0a0d 75%)"></div>'+
    '<div style="position:absolute;inset:0;background-image:'+patterns[seed]+';mix-blend-mode:overlay;opacity:0.7"></div>';
}

/* ============ GRID RENDER ============ */
const listEl = document.getElementById('list');

function buildGrid(){
  listEl.innerHTML = "";
  const rows = filteredData();
  let lastYear = null;
  let grid = null;

  rows.forEach(item=>{
    const [id,year,title,ty,universe,pr,syn] = item;
    if(state.hideWatched && state.watched.has(id)) return;

    if(year!==lastYear){
      const yr = document.createElement('div');
      yr.className = 'year-row';
      yr.innerHTML = '<span>'+year+'</span><span class="ln"></span>';
      listEl.appendChild(yr);
      grid = document.createElement('div');
      grid.className = 'grid';
      listEl.appendChild(grid);
      lastYear = year;
    }
    grid.appendChild(buildPosterCard(item));
  });

  if(!listEl.querySelector('.poster')){
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = "Nothing matches those filters.";
    listEl.appendChild(empty);
  }
}

function buildPosterCard(item){
  const [id,year,title,ty,universe,pr,syn] = item;
  const fam = family(universe);
  const card = document.createElement('div');
  card.className = 'poster' + (state.watched.has(id) ? ' watched' : '');
  card.dataset.id = id;
  card.innerHTML =
    '<div class="poster-art">'+posterArtHTML(fam,id)+'</div>'+
    '<div class="poster-gloss"></div>'+
    '<div class="poster-scrim"></div>'+
    '<div class="poster-priority" style="background:'+(pr==='Essential'?FAM_COLOR[fam]:'transparent')+';opacity:'+(pr==='Essential'?1:pr==='Recommended'?0.35:0.15)+'"></div>'+
    '<div class="poster-top"><span class="poster-year">'+year+'</span><span class="poster-type">'+TYPE_ICON[ty]+'</span></div>'+
    '<button class="poster-check" type="button" aria-label="Mark watched">'+CHECK_ICON+'</button>'+
    '<div class="poster-title">'+escapeHtml(title)+'</div>';

  card.addEventListener('mousemove', e=>{
    if(REDUCE_MOTION) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX-rect.left)/rect.width, py = (e.clientY-rect.top)/rect.height;
    const rotY = (px-0.5)*14, rotX = (0.5-py)*14;
    card.style.transform = 'perspective(700px) rotateX('+rotX+'deg) rotateY('+rotY+'deg) scale(1.04)';
    card.style.setProperty('--mx',(px*100)+'%'); card.style.setProperty('--my',(py*100)+'%');
  });
  card.addEventListener('mouseleave', ()=>{ card.style.transform = 'perspective(700px)'; });

  card.querySelector('.poster-check').addEventListener('click', e=>{
    e.stopPropagation();
    toggleWatched(id, card);
  });
  card.addEventListener('click', ()=> openDetail(item, false, e=>e));
  return card;
}

function toggleWatched(id, card){
  const isNowWatched = !state.watched.has(id);
  if(isNowWatched) state.watched.add(id); else state.watched.delete(id);
  card.classList.toggle('watched', isNowWatched);
  if(state.hideWatched && isNowWatched){ setTimeout(buildGrid, 220); }
  renderStats();
  saveState();
}

/* ============ DETAIL MODAL ============ */
const detailOverlay = document.getElementById('detailOverlay');
const detailModal = document.getElementById('detailModal');

function openDetail(item, isUpcoming){
  const fam = isUpcoming ? 'mcu' : family(item[4]);
  document.getElementById('detailArt').innerHTML = posterArtHTML(fam, isUpcoming ? 1 : item[0]);

  if(isUpcoming){
    document.getElementById('detailTitle').textContent = item.title;
    document.getElementById('detailMeta').innerHTML =
      '<span class="fam-dot" style="background:'+FAM_COLOR.mcu+'"></span><span>'+escapeHtml(item.universe)+'</span>';
    document.getElementById('detailLockedTag').innerHTML =
      '<div class="detail-locked-tag">'+LOCK_ICON.replace('viewBox="0 0 24 24"','viewBox="0 0 24 24" style="width:13px;height:13px"')+'<span>Releases '+item.date+'</span></div>';
    document.getElementById('detailSynopsis').textContent = item.synopsis;
    document.getElementById('detailActions').innerHTML =
      '<a class="action-btn" target="_blank" rel="noopener" href="'+trailerUrl(item.title)+'">'+PLAY_ICON+' Trailer</a>'+
      '<a class="action-btn" target="_blank" rel="noopener" href="'+imdbUrl(item.title)+'">'+EXT_ICON+' IMDb</a>';
  } else {
    const [id,year,title,ty,universe,pr,syn] = item;
    document.getElementById('detailTitle').textContent = title;
    document.getElementById('detailMeta').innerHTML =
      '<span class="fam-dot" style="background:'+FAM_COLOR[fam]+'"></span><span>'+escapeHtml(universe)+'</span>'+
      '<span class="sep">&middot;</span><span>'+year+'</span>'+
      '<span class="sep">&middot;</span><span>'+ty+'</span>'+
      '<span class="sep">&middot;</span><span class="pill '+pr+'">'+pr+'</span>';
    document.getElementById('detailLockedTag').innerHTML = '';
    document.getElementById('detailSynopsis').textContent = syn;
    const isW = state.watched.has(id);
    document.getElementById('detailActions').innerHTML =
      '<button class="action-btn primary'+(isW?' on':'')+'" id="detailWatchBtn" type="button">'+CHECK_ICON+' '+(isW?'Watched':'Mark watched')+'</button>'+
      '<a class="action-btn" target="_blank" rel="noopener" href="'+trailerUrl(title)+'">'+PLAY_ICON+' Trailer</a>'+
      '<a class="action-btn" target="_blank" rel="noopener" href="'+imdbUrl(title)+'">'+EXT_ICON+' IMDb</a>';
    document.getElementById('detailWatchBtn').addEventListener('click', ()=>{
      const nowW = !state.watched.has(id);
      if(nowW) state.watched.add(id); else state.watched.delete(id);
      const card = listEl.querySelector('.poster[data-id="'+id+'"]');
      if(card) card.classList.toggle('watched', nowW);
      renderStats(); saveState();
      openDetail(item, false);
    });
  }
  detailOverlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeDetail(){
  detailOverlay.classList.remove('show');
  document.body.style.overflow = '';
}
document.getElementById('detailClose').addEventListener('click', closeDetail);
detailOverlay.addEventListener('click', e=>{ if(e.target===detailOverlay) closeDetail(); });
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeDetail(); });

function trailerUrl(title){ return 'https://www.youtube.com/results?search_query='+encodeURIComponent(title+' official trailer'); }
function imdbUrl(title){ return 'https://www.imdb.com/find/?q='+encodeURIComponent(title); }

/* ============ UPCOMING GRID ============ */
function renderUpcoming(){
  const grid = document.getElementById('upcomingGrid');
  grid.innerHTML = '';
  UPCOMING.forEach(item=>{
    const card = document.createElement('div');
    card.className = 'poster locked';
    card.innerHTML =
      '<div class="poster-art">'+posterArtHTML('mcu',1)+'</div>'+
      '<div class="poster-scrim"></div>'+
      '<div class="lock-badge">'+LOCK_ICON+'</div>'+
      '<div class="poster-title">'+escapeHtml(item.title)+'</div>';
    card.addEventListener('click', ()=> openDetail(item, true));
    grid.appendChild(card);
  });
}

/* ============ STATS / HERO ============ */
function renderStats(){
  const allFiltered = filteredData();
  const total = allFiltered.length;
  const watchedCount = allFiltered.filter(r=>state.watched.has(r[0])).length;
  const pct = total ? Math.round((watchedCount/total)*100) : 0;

  document.getElementById('pctBig').innerHTML = pct+'<span class="unit">%</span>';
  document.getElementById('progressFill').style.width = pct+'%';

  const essTotal = ESSENTIAL_TOTAL;
  const essWatched = DATA.filter(d=>d[5]==='Essential' && state.watched.has(d[0])).length;
  document.getElementById('essNum').textContent = essWatched+'/'+essTotal;

  const overallWatched = state.watched.size;
  let status;
  if(overallWatched===0) status = "Not started yet.";
  else if(essWatched>=essTotal && overallWatched<TOTAL) status = "<b>Essential path complete</b> \u2014 recommended and optional titles remain.";
  else if(overallWatched>=TOTAL) status = "<b>Every title watched.</b> All caught up before Doomsday.";
  else status = "<b>"+overallWatched+"</b> of "+TOTAL+" watched overall.";
  document.getElementById('statusLine').innerHTML = status;
  document.getElementById('floatText').textContent = overallWatched+'/'+TOTAL;
}

/* ============ COUNTDOWN ============ */
const DOOMSDAY = new Date('2026-12-18T00:00:00');
function updateCountdown(){
  const diff = DOOMSDAY - new Date();
  document.getElementById('doomNum').textContent = diff<=0 ? '0' : Math.floor(diff/86400000);
}

/* ============ DROPDOWNS ============ */
function buildDropdown(key, panelId, labelId, options, defaultLabel){
  const panel = document.getElementById(panelId);
  panel.innerHTML = '';
  options.forEach(opt=>{
    const item = document.createElement('div');
    item.className = 'dd-item' + (state[key]===opt.value ? ' sel' : '');
    item.innerHTML =
      '<span class="item-left">'+(opt.dot?'<span class="fam-dot" style="background:'+opt.dot+'"></span>':'')+opt.label+'</span>'+
      '<svg class="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>';
    item.addEventListener('click', ()=>{
      state[key] = opt.value;
      closeAllDropdowns();
      const btn = document.getElementById(panelId.replace('Panel','')).querySelector('.dd-btn');
      btn.classList.toggle('set', opt.value!=='all');
      document.getElementById(labelId).textContent = opt.value==='all' ? defaultLabel : opt.label;
      buildDropdown(key, panelId, labelId, options, defaultLabel);
      buildGrid(); renderStats();
    });
    panel.appendChild(item);
  });
}
function closeAllDropdowns(){
  document.querySelectorAll('.dd-panel').forEach(p=>p.classList.remove('open'));
  document.querySelectorAll('.dd-btn').forEach(b=>b.classList.remove('open'));
}
function wireDropdownToggle(wrapId){
  const wrap = document.getElementById(wrapId);
  const btn = wrap.querySelector('.dd-btn');
  const panel = wrap.querySelector('.dd-panel');
  btn.addEventListener('click', (e)=>{
    e.stopPropagation();
    const isOpen = panel.classList.contains('open');
    closeAllDropdowns();
    if(!isOpen){ panel.classList.add('open'); btn.classList.add('open'); }
  });
}
document.addEventListener('click', closeAllDropdowns);

/* ============ THEME ============ */
function initThemeDots(){
  const wrap = document.getElementById('themeDots');
  wrap.innerHTML = '';
  THEMES.forEach(t=>{
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'theme-dot' + (state.theme===t.id ? ' active' : '');
    dot.style.background = t.color;
    dot.addEventListener('click', ()=>{
      state.theme = t.id;
      applyTheme();
      wrap.querySelectorAll('.theme-dot').forEach(d=>d.classList.remove('active'));
      dot.classList.add('active');
      buildGrid(); renderUpcoming(); saveState();
    });
    wrap.appendChild(dot);
  });
}
function applyTheme(){
  if(state.theme){ document.documentElement.setAttribute('data-theme', state.theme); }
  else { document.documentElement.removeAttribute('data-theme'); }
}

/* ============ DECADE NAV ============ */
function initDecadeNav(){
  const decades = [ {label:"1990s",from:1990,to:1999}, {label:"2000s",from:2000,to:2009}, {label:"2010s",from:2010,to:2019}, {label:"2020s",from:2020,to:2029} ];
  const nav = document.getElementById('decadeNav');
  nav.innerHTML = '';
  decades.forEach(dec=>{
    const pill = document.createElement('button');
    pill.className = 'decade-pill'; pill.type = 'button'; pill.textContent = dec.label;
    pill.addEventListener('click', ()=>{
      const target = [...listEl.querySelectorAll('.year-row')].find(el=>{
        const y = parseInt(el.textContent,10);
        return y>=dec.from && y<=dec.to;
      });
      if(target) target.scrollIntoView({ behavior: REDUCE_MOTION ? 'auto' : 'smooth', block:'start' });
      nav.querySelectorAll('.decade-pill').forEach(p=>p.classList.remove('active'));
      pill.classList.add('active');
    });
    nav.appendChild(pill);
  });
}

/* ============ SCROLL BEHAVIOR ============ */
const filterBar = document.getElementById('filterBar');
const floatPill = document.getElementById('floatPill');
let heroBottom = 0;
function measureHero(){ heroBottom = document.querySelector('.hero').getBoundingClientRect().bottom + window.scrollY; }
window.addEventListener('scroll', ()=>{
  filterBar.classList.toggle('compact', window.scrollY > 40);
  floatPill.classList.toggle('show', window.scrollY > heroBottom - 100);
}, { passive:true });
floatPill.addEventListener('click', ()=> window.scrollTo({ top:0, behavior: REDUCE_MOTION ? 'auto' : 'smooth' }));

/* ============ HIDE TOGGLE ============ */
const hideSwitch = document.getElementById('hideSwitch');
function toggleHide(){ state.hideWatched = !state.hideWatched; hideSwitch.classList.toggle('on', state.hideWatched); buildGrid(); }
hideSwitch.addEventListener('click', toggleHide);
document.getElementById('hideLabel').addEventListener('click', toggleHide);

/* ============ RESET ============ */
const modalBg = document.getElementById('modalBg');
document.getElementById('resetBtn').addEventListener('click', ()=> modalBg.classList.add('show'));
document.getElementById('modalCancel').addEventListener('click', ()=> modalBg.classList.remove('show'));
modalBg.addEventListener('click', e=>{ if(e.target===modalBg) modalBg.classList.remove('show'); });
document.getElementById('modalConfirm').addEventListener('click', ()=>{
  state.watched.clear();
  modalBg.classList.remove('show');
  buildGrid(); renderStats(); saveState();
  showToast('Progress reset');
});
let toastTimer=null;
function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.remove('show'), 2200);
}

/* ============ SEARCH ============ */
document.getElementById('search').addEventListener('input', e=>{
  state.search = e.target.value.trim().toLowerCase();
  buildGrid(); renderStats();
});

/* ============ STARFIELD ============ */
function initStars(){
  const canvas = document.getElementById('stars');
  const ctx = canvas.getContext('2d');
  const hero = document.querySelector('.hero');
  let stars = [];
  function resize(){
    canvas.width = hero.offsetWidth; canvas.height = hero.offsetHeight;
    const count = Math.min(90, Math.floor((canvas.width*canvas.height)/9000));
    stars = Array.from({length:count}, ()=>({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      r:Math.random()*1.4+0.3, s:Math.random()*0.4+0.1, phase:Math.random()*Math.PI*2
    }));
  }
  let t = 0;
  function tick(){
    if(REDUCE_MOTION){ return; }
    t += 0.02;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#ffffff';
    stars.forEach(st=>{
      const alpha = 0.3 + 0.5*Math.abs(Math.sin(t*st.s+st.phase));
      ctx.globalAlpha = alpha;
      ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  }
  resize();
  window.addEventListener('resize', resize);
  if(!REDUCE_MOTION) requestAnimationFrame(tick);
}

/* ============ INIT ============ */
async function init(){
  await loadState();
  applyTheme();
  initThemeDots();

  buildDropdown('fam','ddUniversePanel','ddUniverseLabel',
    [{label:'All universes',value:'all'}].concat(Object.keys(FAM_LABEL).map(f=>({label:FAM_LABEL[f],value:f,dot:FAM_COLOR[f]}))),
    'Universe');
  buildDropdown('ty','ddTypePanel','ddTypeLabel',
    [{label:'All types',value:'all'},{label:'Movie',value:'Movie'},{label:'Series',value:'Series'},{label:'Special',value:'Special'}],
    'Type');
  buildDropdown('pr','ddPriorityPanel','ddPriorityLabel',
    [{label:'All priorities',value:'all'},{label:'Essential',value:'Essential'},{label:'Recommended',value:'Recommended'},{label:'Optional',value:'Optional'}],
    'Priority');
  wireDropdownToggle('ddUniverse'); wireDropdownToggle('ddType'); wireDropdownToggle('ddPriority');

  initDecadeNav();
  renderUpcoming();
  buildGrid();
  renderStats();
  updateCountdown();
  setInterval(updateCountdown, 3600000);
  measureHero();
  window.addEventListener('resize', measureHero);
  initStars();
}
init();


})();
