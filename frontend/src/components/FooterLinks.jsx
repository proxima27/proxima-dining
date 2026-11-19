import React from 'react';
import { Code2, MessageCircle, MessagesSquare, Globe, Camera, Link2, ArrowUpRight } from 'lucide-react';
export const channels = [
 ['github','GitHub',Code2,'https://github.com/…'],
 ['whatsapp','WhatsApp',MessageCircle,'https://wa.me/…'],
 ['discord','Discord',MessagesSquare,'https://discord.gg/…'],
 ['website','Website',Globe,'https://…'],
 ['instagram','Instagram',Camera,'https://www.instagram.com/…'],
 ['facebook','Facebook',Link2,'https://www.facebook.com/…'],
];
export function FooterLinks({links={}}){
 const shown=channels.filter(([k])=>links[k]);
 return shown.length>0 && <div className="social-buttons" role="group" aria-label="Proxima links">{shown.map(([k,name,Icon])=><a key={k} href={links[k]} target="_blank" rel="noopener noreferrer"><Icon size={14}/>{name}<ArrowUpRight size={12}/></a>)}</div>;
}
export function FooterLinkFields({links,onChange}){
 function update(k,obj){onChange({...links,[k]:{...links[k],...obj}})}
 return <fieldset className="social-editor"><legend>Footer buttons</legend><p>Enter an HTTPS address, then turn on “Show in footer”. Turning a button off keeps its address for later.</p>{channels.map(([k,name,Icon,hint])=><div className="social-line" key={k}><label htmlFor={'social-'+k}><Icon size={15}/>{name} URL</label><label className="social-switch"><input type="checkbox" role="switch" aria-label={'Show '+name+' in footer'} checked={links[k]?.visible||false} onChange={e=>update(k,{visible:e.target.checked})}/>Show in footer</label><input id={'social-'+k} type="url" pattern="https://.+" maxLength="1024" required={!!links[k]?.visible} value={links[k]?.url||''} onChange={e=>update(k,{url:e.target.value})} placeholder={hint}/></div>)}</fieldset>;
}
