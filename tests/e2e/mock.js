window.supabase={createClient(){
  const st=JSON.parse(localStorage.getItem('mockdb')||'null')||window.MOCK_INIT;
  const persist=()=>localStorage.setItem('mockdb',JSON.stringify(st));
  const sess=()=>st.session;
  function builder(t){
    let rows=()=>st.db[t]||[];let filt=[];let op='select',payload=null,single=false,maybe=false,ret=false;
    const b={select(){if(op!=='select')ret=true;return b},eq(k,v){filt.push([k,v]);return b},neq(k,v){filt.push([k,v,'neq']);return b},is(){return b},gte(){return b},order(){return b},limit(){return b},in(){return b},
      single(){single=true;return b},maybeSingle(){maybe=true;return b},
      insert(p){op='insert';payload=p;return b},update(p){op='update';payload=p;return b},delete(){op='delete';return b},
      then(res,rej){try{res(exec())}catch(e){rej(e)}}};
    function exec(){
      st.db[t]=st.db[t]||[];const match=r=>filt.every(([k,v,n])=>n?r[k]!=v:r[k]==v);
      if(op==='insert'){const arr=[].concat(payload).map(p=>({id:(st.seq=(st.seq||100)+1),created_at:new Date().toISOString(),...(t==='org_invites'?{token:'tk'+(st.seq),expires_at:'2099-01-01',revoked:false,uses:0}:{}),...p}));
        if(t==='designs'&&arr.some(a=>st.db.designs.some(d=>d.code===a.code)))return {data:null,error:{code:'23505',message:'dup'}};
        if(t==='deal_messages')arr.forEach(a=>a.sender_role=st.me_role);if(t==='customer_orders')arr.forEach(a=>{a.id=(st.coseq=(st.coseq||5000)+1);a.status='sent';a.log=[{t:'הלקוח שלח את ההזמנה',at:new Date().toISOString()}]});
        st.db[t].push(...arr);persist();return {data:single?arr[0]:arr,error:null}}
      if(op==='update'){st.db[t].filter(match).forEach(r=>Object.assign(r,payload));persist();return {data:null,error:null}}
      if(op==='delete'){st.db[t]=st.db[t].filter(r=>!match(r));persist();return {data:null,error:null}}
      let d=st.db[t].filter(match).map(r=>({...r}));
      if(t==='deals')d=d.map(x=>({...x,winery:{name:(st.db.organizations.find(o=>o.id===x.winery_id)||{}).name},gallery:{name:'הגלריה'},wine:st.db.wines.find(w=>w.id===x.wine_id)||null,invoices:null,print_orders:st.db.print_orders.find(o=>o.deal_id===x.id)||null,deal_messages:st.db.deal_messages.filter(m=>m.deal_id===x.id)}));
      if(t==='profiles')d=d.map(x=>({...x,org:st.db.organizations.find(o=>o.id===x.org_id)||null}));
      if(single||maybe)return {data:d[0]||null,error:null};return {data:d,error:null,count:d.length}
    }
    return b;
  }
  const FLOW={price:['sent','priced'],approve:['priced','sign'],sign:['sign','pay'],paid:['pay','active'],reject:[null,'rejected'],change:['priced','sent']};
  return {
    from:builder,
    async rpc(fn,a){if(fn==='request_license'){const id=(st.dseq=(st.dseq||999)+1);st.db.deals.push({id,winery_id:st.me_org,gallery_id:'g1',artist_id:'a1',work_id:a.p_work,wine_id:a.p_wine,design_code:a.p_design,license_type:a.p_type,qty_tier:a.p_qty,exclusive:a.p_exclusive,adj_pct:0,status:'sent',created_at:new Date().toISOString()});persist();return {data:id,error:null}}
      if(fn==='render_quota_left')return {data:5,error:null};
      if(fn==='track'){st.track=(st.track||0)+1;persist();return {data:null,error:null}}
      if(fn==='engine_status')return {data:{spend:42.5,budget:300,breaker:false,images:61,texts:120,failed:2,by_org:{'יקב הבדיקה':12}},error:null};
      if(fn==='application_decide'){const ap=st.db.applications.find(x=>x.id===a.p_id);ap.status=a.p_ok?'approved':'rejected';ap.gallery=a.p_gallery;persist();return {data:ap.status,error:null}}
      if(fn==='join_org'){const i=(st.db.org_invites||[]).find(x=>x.token===a.p_token&&!x.revoked);if(!i)return {data:false,error:null};const p=st.db.profiles.find(x=>x.id===st.user.id);p.role=i.role;p.status='active';p.org_id=i.org_id;st.me_role=i.role;st.me_org=i.org_id;i.uses=(i.uses||0)+1;persist();return {data:true,error:null}}
      if(fn==='delete_my_account'){st.db.profiles=st.db.profiles.filter(x=>x.id!==st.user.id);st.deleted=true;persist();return {data:null,error:null}}
      if(fn==='join_as_customer'){const p=st.db.profiles.find(x=>x.id===st.user.id);p.role='customer';p.status='active';p.org_id='w1';st.me_role='customer';persist();return {data:true,error:null}}
      if(fn==='corder_action'){const o=st.db.customer_orders.find(x=>x.id===a.p_id);const M={wsave:[null,null],wsend:['sent','review'],wok:['sent','approved'],cok:['review','approved'],cchange:['review','sent'],wprint:['approved','print'],done:['print','done'],wundo:[null,null],wpaid:['approved','approved'],cancel:[null,'cancel']};const f=M[a.p_action];if(f[0]&&o.status!==f[0])return {data:null,error:{message:'הפעולה אינה אפשרית בשלב הזה'}};if(a.p_action==='wsave')o.winery_design=a.p_design;if(a.p_action==='wundo')o.winery_design=null;if(a.p_action==='wpaid')o.paid_at='2026-11-19';if(f[1])o.status=f[1];o.log.push({t:a.p_action,at:new Date().toISOString()});persist();return {data:o.status,error:null}}
      if(fn==='advance_deal'){const d=st.db.deals.find(x=>x.id===a.p_deal);if(a.p_action==='order'){st.db.print_orders.push({deal_id:d.id,stage:1,due:'2026-12-10'});persist();return {data:d.status,error:null}}const f=FLOW[a.p_action];if(!f||(f[0]&&d.status!==f[0]))return {data:null,error:{message:'הפעולה '+a.p_action+' אינה אפשרית בשלב הזה'}};d.status=f[1];if(a.p_action==='price')d.adj_pct=a.p_adj;if(a.p_action==='paid'){d.paid_at='2026-11-19';d.ends_at='2027-11-19'}persist();return {data:d.status,error:null}}},
    storage:{from(){return {async createSignedUrls(p){return {data:p.map(x=>({path:x,signedUrl:'img/p3.jpg'})),error:null}},async createSignedUrl(p){return {data:{signedUrl:'img/p3.jpg'},error:null}},getPublicUrl(p){return {data:{publicUrl:'img/p3.jpg'}}},async upload(p){(window._ups=window._ups||[]).push(p);return {data:{path:p},error:null}}}}},
    auth:{async getSession(){return {data:{session:sess()}}},async setSession(){st.session={user:st.user};persist();return {error:null}},
      async signInWithPassword(c){st.session={user:st.user};persist();return {data:{user:st.user,session:st.session},error:null}},async signUp(c){st.session={user:st.user};persist();return {data:{user:st.user,session:st.session},error:null}},async signInWithOtp(){window.__otp=(window.__otp||0)+1;return {error:null}},async signOut(){st.session=null;persist();return {error:null}},onAuthStateChange(){}}
  };
}};
