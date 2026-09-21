import fs from "node:fs/promises";
import { CONFIG } from "../config.mjs";

const SLEEPER = "https://api.sleeper.app/v1";
const ESPN = "https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons";

async function getJson(url, headers = {}) {
  const res = await fetch(url, {headers:{Accept:"application/json","User-Agent":"ChalupaFF/1.0",...headers}});
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0,200)}`);
  return text ? JSON.parse(text) : null;
}
const optional = async (url, headers={}) => { try{return await getJson(url,headers)}catch{return null} };
const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;

function scoreStats(stats, scoring) {
  if (!stats || !scoring) return null;
  let total=0, matched=false;
  for (const [k,p] of Object.entries(scoring)) {
    if (stats[k]==null || !Number.isFinite(Number(p)) || !Number.isFinite(Number(stats[k]))) continue;
    total += Number(p)*Number(stats[k]); matched=true;
  }
  return matched ? Number(total.toFixed(2)) : null;
}
function sleeperStatus(p) {
  const s=String(p?.injury_status||p?.status||"").toUpperCase();
  return ["OUT","DOUBTFUL","QUESTIONABLE","IR","PUP","SUSPENDED"].includes(s)?s:"";
}
function formatStats(s) {
  if(!s||!Object.keys(s).length) return "No live stat line";
  const map=[["pass_yd","pass yds"],["pass_td","pass TD"],["rush_yd","rush yds"],["rush_td","rush TD"],["rec","rec"],["rec_yd","rec yds"],["rec_td","rec TD"],["fum_lost","fum lost"],["int","INT"]];
  const a=map.filter(([k])=>s[k]!=null&&Number(s[k])!==0).map(([k,l])=>`${s[k]} ${l}`);
  return a.length?a.join(" • "):"Stat line available";
}
function sleeperPlayer(id, players, stats, projections, scoring) {
  const p=players[id]||{}, s=stats?.[id]||{}, pr=projections?.[id]||{};
  return {id,pos:p.position||p.fantasy_positions?.[0]||"—",name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(" ")||id,nfl:p.team||"FA",game:p.team||"Free agent",score:scoreStats(s,scoring)??num(s.pts_ppr??s.pts_half_ppr??s.pts_std),projection:scoreStats(pr,scoring)??num(pr.pts_ppr??pr.pts_half_ppr??pr.pts_std),status:sleeperStatus(p),stats:formatStats(s),news:""};
}
function estimatedWin(a,b) { return Math.round(50+50*Math.tanh((a-b)/24)); }

async function fetchSleeper(id,week,players) {
  const [league,rosters,users,matchups,stats,projections]=await Promise.all([
    getJson(`${SLEEPER}/league/${id}`),getJson(`${SLEEPER}/league/${id}/rosters`),getJson(`${SLEEPER}/league/${id}/users`),
    getJson(`${SLEEPER}/league/${id}/matchups/${week}`),
    optional(`${SLEEPER}/stats/nfl/regular/${CONFIG.season}/${week}`),
    optional(`https://api.sleeper.com/projections/nfl/regular/${CONFIG.season}/${week}`)
  ]);
  const me=users.find(u=>String(u.username||"").toLowerCase()===CONFIG.sleeperUsername.toLowerCase());
  const byRoster=new Map(rosters.map(r=>[String(r.roster_id),r])), byUser=new Map(users.map(u=>[String(u.user_id),u]));
  const mine=rosters.find(r=>String(r.owner_id)===String(me?.user_id));
  const name=r=>byUser.get(String(r?.owner_id))?.metadata?.team_name||byUser.get(String(r?.owner_id))?.display_name||"Roster "+(r?.roster_id??"?");
  const team=m=>{
    const r=byRoster.get(String(m.roster_id)), starters=new Set((m.starters||[]).map(String)), all=(m.players||[]).map(String);
    const startersP=all.filter(x=>starters.has(x)), benchP=all.filter(x=>!starters.has(x)&&x!=="0");
    const make=id=>sleeperPlayer(id,players,stats,projections,league.scoring_settings);
    return {name:name(r),score:num(m.points??m.custom_points),projection:Number(startersP.reduce((t,id)=>t+(projections?.[id]?(scoreStats(projections[id],league.scoring_settings)??num(projections[id].pts_ppr??projections[id].pts_half_ppr??projections[id].pts_std)):0),0).toFixed(2)),players:{starters:startersP.map(make),bench:benchP.map(make)}};
  };
  const groups=new Map();
  for(const m of matchups){const k=String(m.matchup_id??`bye-${m.roster_id}`);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(team(m));}
  const allMatchups=[...groups.entries()].map(([id,teams])=>({id,teams}));
  const mineM=mine?matchups.find(m=>String(m.roster_id)===String(mine.roster_id)):null;
  const mineT=mineM?team(mineM):null;
  const opp=mineM&&mineM.matchup_id!=null?(groups.get(String(mineM.matchup_id))||[]).find(t=>t.name!==mineT?.name):null;
  const rank=[...rosters].sort((a,b)=>num(b.settings?.wins)-num(a.settings?.wins)||num(a.settings?.losses)-num(b.settings?.losses)||num(b.settings?.fpts)-num(a.settings?.fpts)).findIndex(r=>String(r.roster_id)===String(mine?.roster_id))+1;
  return {id:`sleeper-${id}`,platform:"Sleeper",leagueId:id,name:league.name,week,record:`${num(mine?.settings?.wins)}-${num(mine?.settings?.losses)}${num(mine?.settings?.ties)?`-${num(mine.settings.ties)}`:""}`,rank:rank||0,matchup:{myTeam:mineT||{name:"Team unavailable",score:0,projection:0,players:{starters:[],bench:[]}},opponent:opp||{name:"Opponent unavailable",score:0,projection:0,players:{starters:[],bench:[]}},winProbability:mineT&&opp?estimatedWin(mineT.projection,opp.projection):null},matchups:allMatchups,winProbabilityEstimated:true};
}

function espnHeaders(){return process.env.ESPN_S2&&process.env.ESPN_SWID?{Cookie:`espn_s2=${process.env.ESPN_S2}; SWID=${process.env.ESPN_SWID}`}:{}}
async function espnFetch(l,views){const u=new URL(`${ESPN}/${l.season}/segments/0/leagues/${l.id}`);for(const v of views)u.searchParams.append("view",v);return getJson(u.toString(),espnHeaders())}
function espnPlayer(e,period){const p=e.playerPoolEntry?.player||e.player||{}, s=(p.stats||[]).find(x=>Number(x.scoringPeriodId)===period&&x.statSourceId===0)||(p.stats||[]).find(x=>Number(x.scoringPeriodId)===period), pr=(p.stats||[]).find(x=>Number(x.scoringPeriodId)===period&&x.statSourceId===1), st=String(p.injuryStatus||"").toUpperCase();const slot=String(e.lineupSlotId??"");const pos=({"0":"QB","2":"RB","4":"WR","6":"TE","16":"D/ST","17":"K","23":"FLEX"})[slot]||p.defaultPositionName||"—";return{id:p.id,pos,name:p.fullName||p.name||`Player ${p.id}`,nfl:p.proTeamId!=null?String(p.proTeamId):"",game:"",score:num(e.appliedStatTotal??s?.appliedTotal),projection:num(p.projectedTotal??pr?.appliedTotal),status:["OUT","DOUBTFUL","QUESTIONABLE","IR","PUP","SUSPENDED"].includes(st)?st:"",stats:formatStats(s),news:""}}
function espnTeam(t,period){const r=t.record?.overall||{}, entries=t.roster?.entries||t.rosterForCurrentScoringPeriod?.entries||[], starters=entries.filter(e=>!["20","21","22"].includes(String(e.lineupSlotId))), bench=entries.filter(e=>!starters.includes(e));return{name:t.name||[t.location,t.nickname].filter(Boolean).join(" ")||`Team ${t.id}`,score:num(t.appliedStatTotal??t.totalPoints??t.score),projection:num(t.projectedScore??t.totalProjectedPoints),players:{starters:starters.map(e=>espnPlayer(e,period)),bench:bench.map(e=>espnPlayer(e,period))},_record:`${num(r.wins)}-${num(r.losses)}`}}
async function fetchEspn(l){const [base,scoreboard]=await Promise.all([espnFetch(l,["mSettings","mTeam","mRoster","mMatchup","mBoxscore","mStatus","kona_player_info"]),espnFetch(l,["mScoreboard","mSchedule","mTeam"])]);const period=Number(base.status?.currentScoringPeriod||base.status?.currentMatchupPeriod||1),teams=base.teams||[],mine=teams.find(t=>Number(t.id)===Number(l.teamId)),schedule=(scoreboard.schedule||base.schedule||[]).filter(g=>Number(g.matchupPeriodId||g.matchupPeriod)===period),game=schedule.find(g=>Number(g.home?.teamId)===Number(l.teamId)||Number(g.away?.teamId)===Number(l.teamId)),oppId=game?(Number(game.home?.teamId)===Number(l.teamId)?game.away?.teamId:game.home?.teamId):null,opp=teams.find(t=>Number(t.id)===Number(oppId)),my=espnTeam(mine||{},period),op=espnTeam(opp||{},period),win=game?(Number(game.home?.teamId)===Number(l.teamId)?game.home?.winPercent:game.away?.winPercent):null;const record=mine?.record?.overall||{};return{id:`espn-${l.id}`,platform:"ESPN",leagueId:l.id,teamId:l.teamId,seasonId:l.season,name:base.settings?.name||`ESPN League ${l.id}`,week:period,record:`${num(record.wins)}-${num(record.losses)}${num(record.ties)?`-${num(record.ties)}`:""}`,rank:Number(mine?.rankCalculated||mine?.playoffSeed||mine?.rank||0),matchup:{myTeam:my,opponent:op,winProbability:win==null?null:Math.round(Number(win)<=1?Number(win)*100:Number(win))},matchups:schedule.map((g,i)=>({id:String(g.id??i),teams:[espnTeam(teams.find(t=>Number(t.id)===Number(g.home?.teamId))||{},period),espnTeam(teams.find(t=>Number(t.id)===Number(g.away?.teamId))||{},period)]}))};}

async function main(){
  const now=new Date().toISOString(), state=await optional(`${SLEEPER}/state/nfl`), week=Number(state?.week||3), players=await optional(`${SLEEPER}/players/nfl`)||{};
  const leagues=[],errors=[];
  for(const id of CONFIG.sleeperLeagueIds){try{leagues.push(await fetchSleeper(id,week,players))}catch(e){errors.push(`Sleeper ${id}: ${e.message}`)}}
  for(const l of CONFIG.espnLeagues){try{leagues.push(await fetchEspn(l))}catch(e){errors.push(`ESPN ${l.id}: ${e.message}`)}}
  leagues.sort((a,b)=>(a.platform==="ESPN"?0:1)-(b.platform==="ESPN"?0:1)||a.name.localeCompare(b.name));
  await fs.mkdir("data",{recursive:true});await fs.writeFile("data/live-data.json",JSON.stringify({version:2,live:true,updatedAt:now,week,leagues,errors},null,2));
  console.log(`Wrote live data for ${leagues.length}/8 leagues; ${errors.length} errors`);errors.forEach(e=>console.warn(e));if(!leagues.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exit(1)});