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
Strahd:`The Count finds Ashling beneath the Ravenloft balcony, her red cloak bright against the winter dark. A tiny brass tiger rests in his palm. “I hear you have a weakness for lost creatures,” he says. “How fortunate that I collect them.” Ashling's smile is wary as Strahd places the little token in her hand. The gift is his to her—and even generosity feels like a test.`,
Kaedrin:`A raven lands beside Ashling's red cloak and drops a parcel wrapped in black ribbon. Kaedrin steps from the chapel, noble bearing intact, though the shadow of Izek's axe seems to follow him. “I once thought goodness was enough,” he says. “Now I am less certain. But a gift need not be a bargain.” Kaedrin offers the parcel to Ashling, with no debt attached.`,
Zillah:`Ashling hears a soft mewling from the chapel steps. Zillah crouches beside a small carved cat, one hand resting near the circlet that can pry open thoughts. “Grizzlegut would approve,” Zillah says, almost smiling. Ashling's fingers tighten around the red cloak. Zillah rises and places a small parcel in Ashling's hands. “For someone who never stops rescuing the lost.”`,
Penelope:`Penelope waits in the chapel with a tiny candle tucked into her pocket—a reminder of last year's birthday surprise. “I thought you might like something that doesn't burn,” she says. Ashling glances at the red cloak, then at the scarred little gnome who still stands her ground after Pip and Volenta. Penelope gives Ashling the carefully wrapped gift. The courage behind it is as unmistakable as the gesture.`
},
Lana:{
Strahd:`Strahd waits outside Gertruda's old room, exactly where Lana once hid while he watched with that patient smile. Beside him rests a polished case shaped for a bow. “The Woundroot has served you well,” he says. “A weapon that releases souls. Such a noble purpose for a gift from a monster.” He opens the case and hands Lana a sealed card. “A gift from me, whether you consider that a blessing or a threat.”`,
Kaedrin:`Lana finds Kaedrin in the courtyard, turning Izek's axe so its dark edge catches the snowlight. “You hate the dead,” he says, “and I have spent too long deciding what the living are worth.” He sets the axe aside and offers Lana a parcel. For once, there is no bargain in his voice—only a nobleman's attempt to remember himself.`,
Zillah:`A faint mew comes from the shadow beneath the table. Lana finds Zillah there, coaxing Grizzlegut from a velvet-lined basket. The circlet at Zillah's brow glints; Lana wonders what thoughts it has already stolen. “Even in this castle, something deserves protecting,” Zillah whispers. Thinking of her lost goat mother and the souls waiting for her Woundroot Bow, Lana accepts the small gift Zillah places in her hands.`,
Penelope:`Lana finds Penelope sharpening Veinblade beside the ballroom doors. The gnome's eyes flick toward the shadows, where Volenta once lunged at her. “I don't trust gifts,” Penelope says, “especially from people with fangs.” Lana nods toward the bow at her shoulder. “Neither do I. But sometimes we decide what a gift becomes.” Lana holds out a wrapped parcel for Penelope. “This one is yours.”`
},
Strahd:{
Ashling:`Strahd descends from the chapel balcony as Ashling approaches, red cloak stirring in the draft. A brass tiger sits atop a black gift box. “You have lost so many little beasts,” he says softly. “And yet you continue to gather them around you.” He watches her expression, waiting for fear to become anger. Then he presents the box to Ashling. “Open it, little flame. I promise nothing inside is burning.”`,
Lana:`Strahd returns to the doorway of Gertruda's room, where Lana once tried to disappear from his sight. He holds a narrow case beside her Woundroot Bow. “You have made my existence rather inconvenient,” he says. “Your weapon frees the souls I would prefer to keep.” His smile widens as he places the case in Lana's hands. “Perhaps this gift will prove equally troublesome.”`,
Kaedrin:`A goblet of dark wine waits between Strahd and Kaedrin. “Bahamut offered you virtue. Tiamat offered you power. And I offered you a bargain: ‘I scratch your back.’” Strahd slides a small gift toward Kaedrin, pausing beside the shadow of Izek's axe. “Tell me, old friend—does the new Kaedrin still know how to accept something without owing for it?”`,
Zillah:`Strahd stands behind Zillah's chair, reflected in the polished face of the mind-reading circlet. “Careful,” he murmurs. “A circlet that opens minds is a dangerous thing to wear in a room with me.” A small parcel waits beside Grizzlegut's cushion. Strahd picks it up and places it before Zillah. “I have not forgotten your little cat. Nor have I forgotten what you did at Durst Manor.”`,
Penelope:`Strahd waits beside a black rose, his gaze settling on Veinblade. “Pip was a brave little soul,” he says, watching Penelope's face for the wound to reopen. “And Volenta has always been so terribly… enthusiastic.” He presents a sealed gift to Penelope. “Something that is not a blade. Though I make no promises about its contents.”`
},
Kaedrin:{
Ashling:`Kaedrin finds Ashling in the courtyard, gently coaxing a raven onto her red cloak. The sight unsettles him more than he admits; once, he would have called such tenderness a virtue. Izek's axe rests against the wall. “I have followed power until I barely recognize the path,” he says. “Keep hold of the things that make you kind.” He places his gift in Ashling's hands.`,
Lana:`Kaedrin waits beside the old chapel door. Lana's Woundroot Bow gives a faint pulse as a restless spirit passes through the stone. “You can give the dead something I no longer know how to give the living,” he says. He glances at Izek's axe, then offers Lana a parcel. “Perhaps you can teach me what it means to let something go.”`,
Strahd:`Kaedrin enters the dining hall to find Strahd holding two goblets. “I scratch your back,” the Count repeats, as though the words are an old toast. Kaedrin's hand rests near Izek's axe. “You have made a habit of collecting debts.” Kaedrin sets a small gift before Strahd. “Tonight, let us pretend this is generosity. I am curious how it feels.”`,
Zillah:`Zillah's circlet catches the candlelight as Kaedrin approaches. For an instant, he wonders whether she can read the old prayers to Bahamut buried beneath the newer devotion to Tiamat. She says nothing. Grizzlegut curls around her boots. Kaedrin sets Izek's axe aside and offers Zillah a parcel. “Some secrets are safer when they are given freely.”`
},
Zillah:{
Ashling:`Zillah finds Ashling in the chapel, her red cloak folded around her shoulders. A small cat-shaped charm rests in Zillah's palm; Grizzlegut has already claimed the ribbon. “You keep trying to save every creature,” Zillah says. “I once thought that was weakness.” Her circlet glints as she studies Ashling's face. Then she gives Ashling the charm. “I am beginning to suspect it is a kind of power.”`,
Lana:`Zillah waits outside Gertruda's room, holding a lantern and listening to the restless dead behind the walls. Lana's Woundroot Bow is the one weapon in Barovia that can release what Zillah's mistress would rather bind. “I could read your thoughts,” Zillah says, touching the circlet. “But I would rather hear you say what you want.” She offers Lana a gift, leaving the choice—and the secret—hers.`,
Strahd:`Zillah finds Strahd in the gallery, Grizzlegut tucked safely in her arms. The Count's gaze lingers on the circlet. “You seek power, my dear. I admire ambition, especially when it believes itself secret.” Zillah holds out a velvet box for him. Strahd accepts it with a smile; she wonders what he might be afraid to have read.`,
Kaedrin:`Zillah watches Kaedrin enter, the shadow of Izek's axe following him across the floor. Her circlet hums with thoughts he does not speak: Bahamut, Tiamat, and the distance between the two. Grizzlegut rubs against his boot. “The cat has better judgment than most of us,” she says, placing a sealed parcel in Kaedrin's hands.`,
Penelope:`Penelope stands guard near the ballroom, Veinblade angled toward the shadows. Zillah appears with Grizzlegut tucked beneath one arm. “Volenta is not here,” she says. “And this gift is not a trap.” Penelope eyes the circlet, then the cat. “I trust the cat more than I trust you.” “Wise,” Zillah replies, and offers Penelope the parcel. “No blades. I promise.”`
},
Penelope:{
Ashling:`Penelope finds Ashling by the hearth, where the red cloak hangs to dry. She places a single birthday candle beside a little wrapped gift. “I remember last year's candles,” she says. “I thought you deserved another light that wasn't a fire.” Ashling looks at the small gnome—still fierce, still carrying Pip's absence and Veinblade's weight. Penelope gives her the parcel, a quiet reminder to keep going.`,
Lana:`Penelope finds Lana beside the chapel, listening as a released soul fades into the winter air. “I heard your bow can let them go,” she says. “I wish I could do that for Pip.” Her hand closes around Veinblade. For a moment the fierce gnome looks very small. Then she straightens and places a parcel in Lana's hands. “For the ones we couldn't save—and the ones we still can.”`,
Strahd:`Penelope enters the dining hall with Veinblade at her hip. Strahd waits beside a black rose. “You have kept my gift,” he says, nodding toward the blade. “And you have kept your little defiance.” Penelope thinks of Pip, then of Volenta's lunge. “I keep things that are useful,” she answers. She sets her own gift before Strahd. He laughs, but accepts it.`,
Zillah:`Penelope finds Zillah in the gallery, stroking Grizzlegut while the circlet glints above her brow. “Does it read minds?” Penelope asks. “Only when I wish it to.” “Then you already know I don't trust you.” Zillah smiles. The gnome glances toward the ballroom where Volenta once attacked her, then holds out a parcel to Zillah. “At least this one has no blade.”`
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
async function reveal(){const name=$("character").value;$("status").textContent="";$("scene").classList.add("hidden");if(!name){$("status").textContent="Choose your character before entering the mists.";return;}if(!ready){$("status").textContent="Supabase is not configured. Check the project URL and publishable key in app.js.";return;}$("revealBtn").disabled=true;$("revealBtn").textContent="The Count is deciding…";try{const data=await rpc("reveal_assignment",{p_character:name});if(!data||!data.length){$("status").textContent="No active drawing has been sealed yet. The host must cast the Black Ball first.";return;}const recipient=data[0].recipient;$("giverName").textContent=name;$("recipientName").textContent=recipient;$("sceneText").textContent=sceneText(name,recipient);$("recipient").textContent=recipient;$("afterText").textContent=recipient==="Strahd"?"The Count expects a gift worthy of his attention. Choose wisely.":"Your secret is now yours to keep. Do not let the Count catch you revealing it."; $("scene").classList.remove("hidden");$("scene").classList.remove("reveal-in");void $("scene").offsetWidth;$("scene").classList.add("reveal-in");$("scene").scrollIntoView({behavior:"smooth",block:"center"});}catch(e){$("status").textContent="The mists conceal the answer. Please try again, or contact the host. ("+(e.message||"connection error")+")";}finally{$("revealBtn").disabled=false;$("revealBtn").innerHTML="<span>✦</span> Discover My Fate";}}
$("revealBtn").addEventListener("click",reveal);$("againBtn").addEventListener("click",()=>{$("scene").classList.add("hidden");$("character").value="";$("status").textContent="";window.scrollTo({top:0,behavior:"smooth"});});
$("publishBtn").addEventListener("click",async()=>{if(!ready){$("hostStatus").textContent="Supabase is not configured. Check the project URL and publishable key in app.js.";return;}const code=$("hostCode").value.trim();if(!code){$("hostStatus").textContent="Enter the host code.";return;}const assignments=draw();$("publishBtn").disabled=true;$("hostStatus").textContent="The Count is sealing the fates…";try{await rpc("publish_draw",{p_host_code:code,p_assignments:assignments,p_event_title:$("eventTitle").value.trim()||"Strahdsmas"});$("hostStatus").textContent="Strahdsmas has been cast. All six assignments are now active.";$("hostCode").value="";}catch(e){$("hostStatus").textContent="The drawing could not be published. Check the host code and database setup. ("+(e.message||"error")+")";}finally{$("publishBtn").disabled=false;}});
if(!ready){$("status").textContent="Supabase is not configured. The host must update the project URL and publishable key.";$("revealBtn").disabled=true;$("publishBtn").disabled=true;}
})();