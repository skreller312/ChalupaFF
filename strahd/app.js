(() => {
const SUPABASE_URL="https://doiphqcqtpplllosnwnb.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_9PK-LsqyPseBOqdNS6hQGg_HDzKp7aj";
const CHARACTERS=["Ashling","Lana","Strahd","Kaedrin","Zillah","Penelope"];
const EXCLUSIONS=[["Ashling","Lana"],["Kaedrin","Penelope"]];
const $=id=>document.getElementById(id);
const ready=SUPABASE_URL.startsWith("https://")&&!SUPABASE_URL.includes("YOUR-PROJECT")&&SUPABASE_ANON_KEY.startsWith("sb_publishable_");
async function rpc(functionName, payload){
  const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`,{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${SUPABASE_ANON_KEY}`},
    body:JSON.stringify(payload)
  });
  const raw=await response.text();
  let data; try{data=raw?JSON.parse(raw):null;}catch{data=raw;}
  if(!response.ok){const message=data&&typeof data==="object"?(data.message||data.details||data.hint||JSON.stringify(data)):String(data||response.statusText);throw new Error(message||`HTTP ${response.status}`);}
  return data;
}
const normalize=s=>s.trim().toLocaleLowerCase();
const pairScenes={
Ashling:{
Strahd:`The chapel is quiet except for the rain against its stained glass. Ashling remembers the Count's smirk from the balcony; tonight, Strahd steps down from it and offers a sealed parcel. “You have looked upon my house and survived. Let us see whether you can survive choosing a gift for its master.”`,
Kaedrin:`A raven lands on the chapel rail, where Ashling once caught Strahd's silhouette watching from above. Kaedrin arrives with the same wary look he wore after hearing Strahd's bargain: “I scratch your back.” Ashling finds a card tucked beneath the bird's foot. “A debt is not a gift,” Kaedrin says. “But perhaps this one can be.”`,
Zillah:`The chapel candles gutter. Ashling's vision of herself, burned and still in charred druidic garb, flickers across the dark window—then vanishes. Zillah stands beside the altar, holding a small parcel. “Not every omen has to end in ash,” Zillah says. The ribbon bears a name.`,
Penelope:`The chapel doors creak open. Ashling catches a glimpse of Volenta's wild expression in the polished stone, the instant before Penelope was nearly struck down. Penelope steps from the shadow unharmed, carrying a little black box. “I prefer to give my surprises before anyone can stab me with them.”`
},
Lana:{
Strahd:`The door to Gertruda's room opens with a soft click. Lana remembers hiding there while Strahd smiled as though he had known all along. He now waits beside the window, holding a sealed envelope. “You were difficult to find,” he says. “I do admire a little mystery.”`,
Kaedrin:`In a quiet Ravenloft corridor, Lana hears the echo of Strahd's promise to Kaedrin: “I scratch your back.” Kaedrin appears at the far end, turning a small wrapped box over in his hands. “I thought we could make one exchange without owing the Count anything.”`,
Zillah:`A cold draft moves through Gertruda's abandoned room. Lana steps away from the doorway where she once hid and finds Zillah waiting with a lantern. “No need to hide tonight,” Zillah says, setting a wrapped gift on the sill. Beneath the ribbon is a name.`,
Penelope:`The ballroom is empty, but Lana hears the scrape of a blade. Penelope stands beneath the chandelier, remembering Volenta's crazed stare and the sudden lunge. “I thought I'd choose a gift that couldn't stab me,” Penelope says. A sealed card rests in her palm.`
},
Strahd:{
Ashling:`From the chapel balcony, Strahd watches Ashling enter—the same place where he once allowed himself a knowing smirk. “You have mistaken my patience for mercy before,” he says, descending the stairs. He offers a black envelope. “Do try not to burn this one.”`,
Lana:`Strahd finds Lana near the door to Gertruda's room. “You remember this place,” he says, smiling at the memory of her hiding there. “I remember it rather well.” He places a velvet-wrapped gift on the windowsill. “A small token. No need to hide it.”`,
Kaedrin:`A goblet waits on the table between Strahd and Kaedrin. “I believe I once told you, ‘I scratch your back.’ Such arrangements are terribly difficult to forget.” The Count slides a small parcel across the table. “Consider this an exchange without a ledger.”`,
Zillah:`Strahd turns a small object over in his fingers, recalling Ludmilla's sharp protest: “That was mine and he gave it to you?” He looks up as Zillah enters. “My household has never been especially good at sharing. Perhaps you will set a better example.”`,
Penelope:`Strahd stands beside the ballroom mirror. In its reflection, Volenta's crazed expression flashes for an instant—the moment before she lunged at Penelope. “My household has a regrettable habit of ruining pleasant occasions,” he says. “I have arranged a gift without knives.”`
},
Kaedrin:{
Ashling:`A raven circles the chapel balcony and drops a folded note at Kaedrin's feet. Ashling emerges from the shadows, the memory of Strahd's smirk still hanging over the chapel. “If the Count is watching,” Ashling says, “let him watch us do something decent.” The note bears a name.`,
Lana:`Kaedrin pauses outside Gertruda's room. He knows Lana remembers Strahd's smile from the night she hid there. “Some doors are better left open,” he says, stepping aside. On the floor rests a small gift, wrapped in dark paper and addressed to one person.`,
Strahd:`The dining hall is empty save for Strahd and a single candle. Kaedrin remembers the Count's words—“I scratch your back.” Strahd raises his goblet. “A phrase that has served us both rather well. Tonight, however, I offer something without asking for repayment.”`,
Zillah:`Kaedrin finds Zillah near the servants' passage, where Ludmilla's indignant words still seem to linger: “That was mine and he gave it to you?” Zillah turns, holding a parcel. “I believe this one is mine to give.” A name is written beneath the ribbon.`
},
Zillah:{
Ashling:`A lantern burns beside the chapel doors. Zillah remembers Ludmilla's sharp objection—“that was mine and he gave it to you?”—but tonight no one is arguing over the gift. Ashling stands beneath the balcony where Strahd once watched her. “This one is freely given,” Zillah says.`,
Lana:`Zillah finds Lana outside Gertruda's room, where the Count once smiled at her from the shadows. A lantern throws warm light across the corridor. “No hiding tonight,” Zillah says. “Just a gift, and a name.”`,
Strahd:`Strahd waits in the castle gallery, turning a ribbon between his fingers. Zillah remembers Ludmilla's accusation that something given away had been hers. The Count smiles. “Do not concern yourself with my household's opinions. This one is yours to give—to me.”`,
Kaedrin:`A raven taps at the window, then flies toward the corridor where Kaedrin once heard Strahd promise, “I scratch your back.” Zillah catches up with him and offers a small parcel. “No favors owed. No bargains. Just a name beneath the wax.”`,
Penelope:`In the ballroom, Zillah notices Penelope watching the shadows for Volenta. “She is not here,” Zillah says, setting a parcel beneath the chandelier. Penelope eyes it carefully. “And it doesn't have a blade inside?” “Not this time.”`
},
Penelope:{
Ashling:`Penelope waits in the chapel, far from the ballroom where Volenta once lunged at her. Ashling arrives from beneath the balcony where Strahd had watched with that infuriating smirk. “I thought we deserved one quiet moment in this castle,” Penelope says, offering a small wrapped gift.`,
Lana:`Penelope finds Lana at the entrance to Gertruda's room. “I know this doorway,” she says. “It has a way of making people feel watched.” Lana turns from the threshold as Penelope offers a parcel. “Tonight, at least, the surprise is meant kindly.”`,
Strahd:`Penelope enters the dining hall, where Strahd waits beside a single black rose. “You have survived Volenta's attentions,” he says. “I would hate for a gift from me to prove more dangerous.” He presents a sealed box. His smile suggests he makes no promises.`,
Zillah:`Penelope hears Ludmilla's old complaint echo down the servants' passage: “That was mine and he gave it to you?” Zillah appears with a parcel of their own. Penelope glances toward the shadows, then accepts it. “No jealous brides, no knives. This may be the safest exchange in Ravenloft.”`
}
};
function sceneText(giver,recipient){return pairScenes[giver]?.[recipient]||`${giver} finds ${recipient} beneath the dark windows of Castle Ravenloft. A raven delivers a sealed card, and Strahd's voice drifts from the shadows: “A gift is a curious thing in Barovia. Let us see what you make of this one.”`;}
function shuffle(a){const x=[...a];for(let i=x.length-1;i>0;i--){const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);[x[i],x[j]]=[x[j],x[i]];}return x;}
function draw(){
  for(let attempt=0;attempt<10000;attempt++){
    const recipients=shuffle(CHARACTERS);
    const valid=recipients.every((r,i)=>r!==CHARACTERS[i]&&!EXCLUSIONS.some(([a,b])=>(CHARACTERS[i]===a&&r===b)||(CHARACTERS[i]===b&&r===a)));
    if(!valid) continue;
    const assignment=CHARACTERS.map((giver,i)=>({giver,recipient:recipients[i]}));
    const hasReciprocal=assignment.some(({giver,recipient})=>assignment.some(other=>other.giver===recipient&&other.recipient===giver));
    if(!hasReciprocal) return assignment;
  }
  throw new Error("Could not generate a valid non-reciprocal draw. Please try again.");
}
async function reveal(){const name=$("character").value;$("status").textContent="";$("scene").classList.add("hidden");if(!name){$("status").textContent="Choose your character before entering the mists.";return;}if(!ready){$("status").textContent="Supabase is not configured. Check the project URL and publishable key in app.js.";return;}$("revealBtn").disabled=true;$("revealBtn").textContent="The Count is deciding…";try{const data=await rpc("reveal_assignment",{p_character:name});if(!data||!data.length){$("status").textContent="No active drawing has been sealed yet. The host must cast the Black Ball first.";return;}const recipient=data[0].recipient;$("sceneText").textContent=sceneText(name,recipient);$("recipient").textContent=recipient;$("afterText").textContent=recipient==="Strahd"?"The Count expects a gift worthy of his attention. Choose wisely.":"Your secret is now yours to keep. Do not let the Count catch you revealing it."; $("scene").classList.remove("hidden");$("scene").classList.remove("reveal-in");void $("scene").offsetWidth;$("scene").classList.add("reveal-in");$("scene").scrollIntoView({behavior:"smooth",block:"center"});}catch(e){$("status").textContent="The mists conceal the answer. Please try again, or contact the host. ("+(e.message||"connection error")+")";}finally{$("revealBtn").disabled=false;$("revealBtn").innerHTML="<span>✦</span> Discover My Fate";}}
$("revealBtn").addEventListener("click",reveal);$("againBtn").addEventListener("click",()=>{$("scene").classList.add("hidden");$("character").value="";$("status").textContent="";window.scrollTo({top:0,behavior:"smooth"});});
$("publishBtn").addEventListener("click",async()=>{if(!ready){$("hostStatus").textContent="Supabase is not configured. Check the project URL and publishable key in app.js.";return;}const code=$("hostCode").value.trim();if(!code){$("hostStatus").textContent="Enter the host code.";return;}const assignments=draw();$("publishBtn").disabled=true;$("hostStatus").textContent="The Count is sealing the fates…";try{await rpc("publish_draw",{p_host_code:code,p_assignments:assignments,p_event_title:$("eventTitle").value.trim()||"Strahdsmas"});$("hostStatus").textContent="Strahdsmas has been cast. All six assignments are now active.";$("hostCode").value="";}catch(e){$("hostStatus").textContent="The drawing could not be published. Check the host code and database setup. ("+(e.message||"error")+")";}finally{$("publishBtn").disabled=false;}});
if(!ready){$("status").textContent="Supabase is not configured. The host must update the project URL and publishable key.";$("revealBtn").disabled=true;$("publishBtn").disabled=true;}
})();