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
function normalizeSleeperMap(raw) {
  if (!raw) return {};
  if (!Array.isArray(raw)) return raw;
  return Object.fromEntries(raw.map(x => [
    String(x?.player_id ?? x?.playerId ?? x?.id ?? ""),
    x?.stats && typeof x.stats === "object" ? {...x.stats, ...x} : x
  ]).filter(([k]) => k));
}
function sleeperPlayer(id, players, stats, projections, scoring, schedule, week) {
  const p=players[id]||{}, s=stats?.[id]||{}, pr=projections?.[id]||{};
  const sStats=s?.stats && typeof s.stats === "object" ? s.stats : s;
  const pStats=pr?.stats && typeof pr.stats === "object" ? pr.stats : pr;
  const actual=scoreStats(sStats,scoring)??num(s.pts_ppr??s.pts_half_ppr??s.pts_std);
  const originalProjection=scoreStats(pStats,scoring)??num(pr.pts_ppr??pr.pts_half_ppr??pr.pts_std);
  const nflTeam=p.team||"";
  const game=(Array.isArray(schedule)?schedule:[]).find(g=>Number(g.week)===Number(week)&&String(g.status||"")!=="canceled"&&(g.home===nflTeam||g.away===nflTeam));
  let projection=originalProjection;
  if(game?.status==="complete") projection=actual;
  else if(game?.status==="in_game") projection=Math.max(actual,originalProjection);
  return {
    id,
    pos:p.position||p.fantasy_positions?.[0]||"—",
    name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(" ")||id,
    nfl:p.team||"FA",
    game:p.team||"Free agent",
    score:actual,
    projection:projection,
    status:sleeperStatus(p),
    stats:formatStats(sStats),
    news:""
  };
}
function estimatedWin(a,b) { return Math.round(50+50*Math.tanh((a-b)/24)); }

async function fetchSleeper(id,week,players) {
  const [league,rosters,users,matchups,statsRaw,projectionsRaw,sleeperMe,scheduleRaw]=await Promise.all([
    getJson(`${SLEEPER}/league/${id}`),getJson(`${SLEEPER}/league/${id}/rosters`),getJson(`${SLEEPER}/league/${id}/users`),
    getJson(`${SLEEPER}/league/${id}/matchups/${week}`),
    optional(`${SLEEPER}/stats/nfl/regular/${CONFIG.season}/${week}`),
    optional(`${SLEEPER}/projections/nfl/regular/${CONFIG.season}/${week}`),
    getJson(`${SLEEPER}/user/${encodeURIComponent(CONFIG.sleeperUsername)}`),
    optional(`https://api.sleeper.com/schedule/nfl/regular/${CONFIG.season}`)
  ]);
  const stats=normalizeSleeperMap(statsRaw);
  const projections=normalizeSleeperMap(projectionsRaw);
  const canonicalUserId=sleeperMe?.user_id;
  const me=users.find(u=>String(u.user_id)===String(canonicalUserId))||users.find(u=>String(u.username||"").toLowerCase()===CONFIG.sleeperUsername.toLowerCase());
  const byRoster=new Map(rosters.map(r=>[String(r.roster_id),r]));
  const byUser=new Map(users.map(u=>[String(u.user_id),u]));
  const userForRoster=r=>r?byUser.get(String(r.owner_id)):null;
  const mine=rosters.find(r=>String(r.owner_id)===String(me?.user_id));
  const name=r=>{
    const u=userForRoster(r);
    return u?.metadata?.team_name||u?.display_name||u?.username||`Team ${r?.roster_id??"?"}`;
  };
  const team=m=>{
    const r=byRoster.get(String(m.roster_id));
    const starters=new Set((m.starters||[]).map(String)), all=(m.players||[]).map(String);
    const startersP=all.filter(x=>starters.has(x)), benchP=all.filter(x=>!starters.has(x)&&x!=="0");
    const make=pid=>sleeperPlayer(pid,players,stats,projections,league.scoring_settings,scheduleRaw,week);
    const starterPlayers=startersP.map(make);
    return {
      rosterId:m.roster_id, ownerId:r?.owner_id, name:name(r),
      score:num(m.points??m.custom_points),
      projection:Number(starterPlayers.reduce((t,p)=>t+num(p.projection),0).toFixed(2)),
      players:{starters:starterPlayers,bench:benchP.map(make)}
    };
  };
  const groups=new Map();
  for(const m of matchups){const k=String(m.matchup_id??`bye-${m.roster_id}`);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m);}
  const makeMatchup=(raw,id)=>({id,teams:raw.map(team)});
  const allMatchups=[...groups.entries()].map(([mid,raw])=>makeMatchup(raw,mid));
  const mineM=mine?matchups.find(m=>String(m.roster_id)===String(mine.roster_id)):null;
  const mineT=mineM?team(mineM):null;
  const oppRaw=mineM?.matchup_id!=null?(groups.get(String(mineM.matchup_id))||[]).find(m=>String(m.roster_id)!==String(mineM.roster_id)):null;
  const opp=oppRaw?team(oppRaw):null;
  const rank=[...rosters].sort((a,b)=>num(b.settings?.wins)-num(a.settings?.wins)||num(a.settings?.losses)-num(b.settings?.losses)||num(b.settings?.fpts)-num(a.settings?.fpts)).findIndex(r=>String(r.roster_id)===String(mine?.roster_id))+1;
  return {
    id:`sleeper-${id}`,platform:"Sleeper",leagueId:id,name:league.name,week,
    record:`${num(mine?.settings?.wins)}-${num(mine?.settings?.losses)}${num(mine?.settings?.ties)?`-${num(mine.settings.ties)}`:""}`,
    rank:rank||0,
    matchup:{
      myTeam:mineT||{name:"Team unavailable",score:0,projection:0,players:{starters:[],bench:[]}},
      opponent:opp||{name:"Opponent unavailable",score:0,projection:0,players:{starters:[],bench:[]}},
      winProbability:mineT&&opp?estimatedWin(mineT.projection,opp.projection):null
    },
    matchups:allMatchups,winProbabilityEstimated:true
  };
}

function espnHeaders(){return process.env.ESPN_S2&&process.env.ESPN_SWID?{Cookie:`espn_s2=${process.env.ESPN_S2}; SWID=${process.env.ESPN_SWID}`}:{}}
async function espnFetch(l,views,params={}){const u=new URL(`${ESPN}/${l.season}/segments/0/leagues/${l.id}`);for(const v of views)u.searchParams.append("view",v);for(const [k,v] of Object.entries(params))u.searchParams.set(k,String(v));return getJson(u.toString(),espnHeaders())}
const ESPN_TEAM_ABBR={0:"FA",1:"ATL",2:"BUF",3:"CHI",4:"CIN",5:"CLE",6:"DAL",7:"DEN",8:"DET",9:"GB",10:"TEN",11:"IND",12:"KC",13:"LV",14:"LAR",15:"MIA",16:"MIN",17:"NE",18:"NO",19:"NYG",20:"NYJ",21:"PHI",22:"ARI",23:"PIT",24:"LAC",25:"SF",26:"SEA",27:"TB",28:"WAS",29:"CAR",30:"JAX",33:"BAL",34:"HOU"};
function espnPlayer(e,period){
  const p=e.playerPoolEntry?.player||e.player||{};
  const stats=e.playerPoolEntry?.stats||p.stats||[];
  const s=stats.find(x=>Number(x.scoringPeriodId)===period&&Number(x.statSourceId)===0&&Number(x.statSplitTypeId)===1)
    ||stats.find(x=>Number(x.scoringPeriodId)===period&&Number(x.statSourceId)===0)
    ||stats.find(x=>Number(x.scoringPeriodId)===period);
  const projected=stats.find(x=>Number(x.scoringPeriodId)===period&&Number(x.statSourceId)===1&&Number(x.statSplitTypeId)===1)
    ||stats.find(x=>Number(x.scoringPeriodId)===period&&Number(x.statSourceId)===1)
    ||stats.find(x=>Number(x.scoringPeriodId)===period&&Number(x.statTypeId)===2)
    ||stats.find(x=>Number(x.scoringPeriodId)===period&&Number(x.statTypeId)===1)
    ||stats.find(x=>Number(x.scoringPeriodId)===period&&x.projectedTotal!=null);
  const st=String(p.injuryStatus||"").toUpperCase();
  const slot=String(e.lineupSlotId??"");
  const pos=({"0":"QB","2":"RB","4":"WR","6":"TE","16":"D/ST","17":"K","23":"FLEX"})[slot]||p.defaultPositionName||"—";
  return {
    id:p.id,pos,name:p.fullName||p.name||`Player ${p.id}`,nfl:p.proTeamId!=null?(ESPN_TEAM_ABBR[Number(p.proTeamId)]||String(p.proTeamId)):"FA",
    game:"",score:num(e.playerPoolEntry?.appliedStatTotal??e.appliedStatTotal??s?.appliedTotal),
    projection:num(e.playerPoolEntry?.projectedTotal??projected?.appliedTotal??projected?.appliedStatTotal??p.projectedTotal),
    status:["OUT","DOUBTFUL","QUESTIONABLE","IR","PUP","SUSPENDED"].includes(st)?st:"",
    stats:formatStats(s),news:""
  };
}
function espnTeamFromBox(side,teamMeta,period){
  const entries=side?.rosterForCurrentScoringPeriod?.entries||side?.roster?.entries||[];
  const starters=entries.filter(e=>!["20","21","22"].includes(String(e.lineupSlotId)));
  const bench=entries.filter(e=>!starters.includes(e));
  return {
    name:teamMeta?.name||[teamMeta?.location,teamMeta?.nickname].filter(Boolean).join(" ")||`Team ${side?.teamId??teamMeta?.id??"?"}`,
    score:num(side?.totalPoints),
    projection:num(side?.totalProjectedPointsLive),
    players:{starters:starters.map(e=>espnPlayer(e,period)),bench:bench.map(e=>espnPlayer(e,period))},
    _record:`${num(teamMeta?.record?.overall?.wins)}-${num(teamMeta?.record?.overall?.losses)}`
  };
}
function findEspnSide(game,teamId){if(!game)return null;if(Number(game.home?.teamId)===Number(teamId))return game.home;if(Number(game.away?.teamId)===Number(teamId))return game.away;return null}
async function fetchEspn(l){
  const [statusData,currentBoard,teamsData,settingsData]=await Promise.all([
    espnFetch(l,["mStatus"]),
    espnFetch(l,["mScoreboard"]),
    espnFetch(l,["mTeam","mStandings"]),
    espnFetch(l,["mSettings"])
  ]);
  const period=Number(currentBoard.scoringPeriodId||statusData.status?.currentScoringPeriod||statusData.status?.currentMatchupPeriod||1);
  const [scores,box,scoreboard]=await Promise.all([
    espnFetch(l,["mMatchupScore"],{matchupPeriodId:period,scoringPeriodId:period}),
    espnFetch(l,["mBoxscore","mLiveScoring"],{matchupPeriodId:period,scoringPeriodId:period}),
    espnFetch(l,["mScoreboard"],{scoringPeriodId:period})
  ]);
  const teams=teamsData.teams||[];
  const scoreSchedule=scores.schedule||[];
  const boxSchedule=box.schedule||[];
  const scoreboardSchedule=scoreboard.schedule||[];
  const mine=teams.find(t=>Number(t.id)===Number(l.teamId));
  const game=scoreSchedule.find(g=>Number(g.matchupPeriodId||g.matchupPeriod)===period&&(Number(g.home?.teamId)===Number(l.teamId)||Number(g.away?.teamId)===Number(l.teamId)))||scoreSchedule.find(g=>Number(g.home?.teamId)===Number(l.teamId)||Number(g.away?.teamId)===Number(l.teamId));
  const boxGame=boxSchedule.find(g=>String(g.id??"")===String(game?.id??""))||boxSchedule.find(g=>Number(g.home?.teamId)===Number(game?.home?.teamId)&&Number(g.away?.teamId)===Number(game?.away?.teamId));
  const scoreboardGame=scoreboardSchedule.find(g=>String(g.id??"")===String(game?.id??""))||scoreboardSchedule.find(g=>Number(g.home?.teamId)===Number(game?.home?.teamId)&&Number(g.away?.teamId)===Number(game?.away?.teamId));
  const mySide=findEspnSide(boxGame,l.teamId);
  const oppId=Number(game?.home?.teamId)===Number(l.teamId)?game?.away?.teamId:game?.home?.teamId;
  const oppMeta=teams.find(t=>Number(t.id)===Number(oppId));
  const oppSide=findEspnSide(boxGame,oppId);
  const scoreSide=findEspnSide(game,l.teamId);
  const scoreOppSide=findEspnSide(game,oppId);
  const liveMySide=findEspnSide(scoreboardGame,l.teamId);
  const liveOppSide=findEspnSide(scoreboardGame,oppId);
  const my=espnTeamFromBox(mySide||{},mine,period);
  const boxMyScore=num(mySide?.totalPoints);
  const matchupMyScore=num(scoreSide?.totalPoints);
  const summedMyScore=Number((my.players.starters||[]).reduce((t,p)=>t+num(p.score),0).toFixed(2));
  my.score=boxMyScore!==0?boxMyScore:(matchupMyScore!==0?matchupMyScore:summedMyScore);
  if(num(liveMySide?.totalProjectedPointsLive)>0) my.projection=num(liveMySide.totalProjectedPointsLive);
  else if(!my.projection) my.projection=Number((my.players.starters||[]).reduce((t,p)=>t+num(p.projection),0).toFixed(2));
  const op=espnTeamFromBox(oppSide||{},oppMeta,period);
  const boxOppScore=num(oppSide?.totalPoints);
  const matchupOppScore=num(scoreOppSide?.totalPoints);
  const summedOppScore=Number((op.players.starters||[]).reduce((t,p)=>t+num(p.score),0).toFixed(2));
  op.score=boxOppScore!==0?boxOppScore:(matchupOppScore!==0?matchupOppScore:summedOppScore);
  if(num(liveOppSide?.totalProjectedPointsLive)>0) op.projection=num(liveOppSide.totalProjectedPointsLive);
  else if(!op.projection) op.projection=Number((op.players.starters||[]).reduce((t,p)=>t+num(p.projection),0).toFixed(2));
  const win=scoreSide?.winPercent??scoreSide?.winProbability??scoreSide?.projectedWinPercent??scoreSide?.winPct;
  const record=mine?.record?.overall||{};
  const standingsRank=mine?.rankCalculated||mine?.playoffSeed||mine?.rank||0;
  const matchupList=scoreSchedule.filter(g=>Number(g.matchupPeriodId)===period).map((g,i)=>{
    const h=teams.find(t=>Number(t.id)===Number(g.home?.teamId)), a=teams.find(t=>Number(t.id)===Number(g.away?.teamId));
    const bg=boxSchedule.find(x=>String(x.id??"")===String(g.id??""))||boxSchedule.find(x=>Number(x.home?.teamId)===Number(g.home?.teamId)&&Number(x.away?.teamId)===Number(g.away?.teamId));
    const ht=espnTeamFromBox(bg?.home||g.home,h,period);\n    const at=espnTeamFromBox(bg?.away||g.away,a,period);\n    if(!ht.score) ht.score=num(g.home?.totalPoints);\n    if(!at.score) at.score=num(g.away?.totalPoints);\n    if(!ht.projection) ht.projection=num(g.home?.totalProjectedPointsLive);\n    if(!at.projection) at.projection=num(g.away?.totalProjectedPointsLive);\n    if(!ht.score) ht.score=Number((ht.players.starters||[]).reduce((t,p)=>t+num(p.score),0).toFixed(2));\n    if(!at.score) at.score=Number((at.players.starters||[]).reduce((t,p)=>t+num(p.score),0).toFixed(2));\n    if(!ht.projection) ht.projection=Number((ht.players.starters||[]).reduce((t,p)=>t+num(p.projection),0).toFixed(2));\n    if(!at.projection) at.projection=Number((at.players.starters||[]).reduce((t,p)=>t+num(p.projection),0).toFixed(2));\n    return {id:String(g.id??i),teams:[ht,at]};
  });
  return {
    id:`espn-${l.id}`,platform:"ESPN",leagueId:l.id,teamId:l.teamId,seasonId:l.season,
    name:settingsData?.settings?.name||teamsData.settings?.name||scores.settings?.name||teamsData.settings?.leagueName||`ESPN League ${l.id}`,week:period,
    record:`${num(record.wins)}-${num(record.losses)}${num(record.ties)?`-${num(record.ties)}`:""}`,
    rank:Number(standingsRank),
    matchup:{myTeam:my,opponent:op,winProbability:win==null?null:Math.round(Number(win)<=1?Number(win)*100:Number(win))},
    matchups:matchupList
  };
}

async function main(){
  const now=new Date().toISOString(), state=await optional(`${SLEEPER}/state/nfl`), week=Number(state?.week||3);
  let players={};
  try { players=JSON.parse(await fs.readFile(".cache/sleeper-players.json","utf8")); } catch { players=await optional(`${SLEEPER}/players/nfl`)||{}; }
  const leagues=[],errors=[];
  for(const id of CONFIG.sleeperLeagueIds){try{leagues.push(await fetchSleeper(id,week,players))}catch(e){errors.push(`Sleeper ${id}: ${e.message}`)}}
  for(const l of CONFIG.espnLeagues){try{leagues.push(await fetchEspn(l))}catch(e){errors.push(`ESPN ${l.id}: ${e.message}`)}}
  leagues.sort((a,b)=>(a.platform==="ESPN"?0:1)-(b.platform==="ESPN"?0:1)||a.name.localeCompare(b.name));
  await fs.mkdir("data",{recursive:true});await fs.writeFile("data/live-data.json",JSON.stringify({version:2,live:true,updatedAt:now,week,leagues,errors},null,2));
  console.log(`Wrote live data for ${leagues.length}/8 leagues; ${errors.length} errors`);errors.forEach(e=>console.warn(e));if(!leagues.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exit(1)});