// Game content: obstacle definitions, sign texts, milestones and events.

export const MAX_OPEN = 5;
export const OBS = {
  gass:   { kind:'low',  wid:0.95,len:0.45,h:0.38, label:'Gassflaske uten sikring', hit:'Gassflaske uten sikring. Den trillet.', tiltak:'Gassflasker skal stå oppreist og være sikret, for eksempel med kjetting i et stativ.' },
  sement: { kind:'low',  wid:0.95,len:0.6, h:0.55, label:'Sementsekker lagret i gangveien', hit:'Sementsekken sprakk. Du er nå grå.', tiltak:'Sekker lagres på pall på anvist plass, ikke i gangveien.' },
  drill:  { kind:'low',  wid:0.6, len:0.4, h:0.5,  label:'Drill lagt fra seg på gulvet', hit:'Du tråkket på drillen. Den startet.', tiltak:'Legg drillen i kofferten, ikke på gulvet.' },
  kjegle: { kind:'low',  wid:0.55,len:0.55,h:0.78, label:'Kjegle plassert midt i gangveien', hit:'Kjeglen som skulle advare deg, var selve faren.', tiltak:'Kjegler skal markere faren, ikke være den.' },
  skilt:  { kind:'tall', wid:1.35,len:0.5, h:2.0,  label:'Skilt plassert midt i gangveien', hit:'Du løp rett inn i skiltet. Det var satt opp for din sikkerhet.', tiltak:'Skilt skal varsle om fare, ikke sperre gangveien.' },
  tralle: { kind:'low',  wid:0.95,len:1.3, h:0.85, label:'Trillebår parkert i rømningsvei', hit:'Trillebåren sto i rømningsveien. Nå sitter du i trillebåren.', tiltak:'Trillebåren har ikke parkeringstillatelse i rømningsveien.' },
  barn:   { kind:'kid',  wid:0.5, len:0.5, h:1.15, label:'Barn på byggeplassen', hit:'Nesten-ulykke! Et barn løp etter fotballen rett foran deg. Du bråstoppet.', tiltak:'Sikre byggeplassen mot barn. Gjerdet skal være helt og porten lukket.' },
  laerling:{ kind:'tall', wid:0.75,len:0.6, h:2.0,  label:'Lærling som gikk og så i mobilen', hit:'Lærlingen så ikke opp fra TikTok.', tiltak:'Mobilen i lomma når du går på byggeplassen. Se deg for.' },
  bil:    { kind:'tall', wid:1.95,len:4.4, h:2.3,  label:'Varebil parkert i gangveien', hit:'Rett i varebilen. Den sto parkert i gangveien med motoren i gang.', tiltak:'Varebiler parkeres på anvist plass, ikke i gangveien.' },
  kjor:   { kind:'tall', wid:1.95,len:4.4, h:2.3,  label:'Varebil som kjørte i gangveien', hit:'Varebilen kom kjørende. Du kom deg ikke unna.', tiltak:'Skill kjøretøy og gående. Varebiler skal ikke kjøre i gangveien.' },
  stillas:{ kind:'over', wid:2.05,len:1.3, bottom:1.32, label:'Stillas uten godkjent stillaskort', hit:'Du slo hodet i stillaset. Godt du hadde hjelm.', tiltak:'Få stillaset kontrollert og merket med grønt stillaskort.' },
  hull:   { kind:'pit',  wid:1.7, len:1.8, label:'Hull i dekket uten sikring' },
  grop:   { kind:'pit',  wid:7.2, len:3.2, label:'Usikret byggegrop' },
  kappsag:{ kind:'tall', wid:4.6, len:1.6, h:2.0, label:'Kapping med kappsag midt i gangveien', hit:'Du løp inn i mannen med kappsagen. Han hørte deg ikke for støyen.', tiltak:'Kapping gjøres på avsperret område, med vanning eller avsug mot støv.' },
  tilsyn: { kind:'insp', wid:0.7, len:0.6, h:2.0, label:'Stoppet av Arbeidstilsynet' }
};
export const LOWS = ['gass', 'sement', 'drill', 'kjegle', 'tralle'];
export const SIGN_TEXTS = [['SE DEG', 'FOR'], ['ARBEID', 'PÅGÅR'], ['GANGVEI', 'STENGT'], ['HJELM', 'PÅBUDT'], ['FARE FOR', 'NEDFALL'], ['VIS', 'HENSYN']];
export const signTexCache = {};
export const MILES = { 250:'Godt i gang', 500:'Halvveis rundt blokk C', 750:'Kaffen er kald nå', 1000:'En hel kilometer med vernerunde', 1500:'Verneombudet er i form', 2000:'Dette blir en lang rapport', 3000:'Har noen sett verneombudet?' };
export const EVENTS = { dust:{ warn:'Kappsag i bruk. Det blir støvete.', gear:'briller' } };
export const PICK_GLOW = { lukk:'green', app:'green', kurs:'blue', briller:'halo', ore:'yellow' };
