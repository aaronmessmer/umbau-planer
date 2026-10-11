var re=Object.defineProperty;var ne=Object.getOwnPropertyDescriptor;var m=(o,s,t,e)=>{for(var i=e>1?void 0:e?ne(s,t):s,r=o.length-1,n;r>=0;r--)(n=o[r])&&(i=(e?n(s,t,i):n(i))||i);return e&&i&&re(s,t,i),i};var lt=globalThis,dt=lt.ShadowRoot&&(lt.ShadyCSS===void 0||lt.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,bt=Symbol(),Lt=new WeakMap,K=class{constructor(s,t,e){if(this._$cssResult$=!0,e!==bt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=s,this.t=t}get styleSheet(){let s=this.o,t=this.t;if(dt&&s===void 0){let e=t!==void 0&&t.length===1;e&&(s=Lt.get(t)),s===void 0&&((this.o=s=new CSSStyleSheet).replaceSync(this.cssText),e&&Lt.set(t,s))}return s}toString(){return this.cssText}},Ct=o=>new K(typeof o=="string"?o:o+"",void 0,bt),$=(o,...s)=>{let t=o.length===1?o[0]:s.reduce((e,i,r)=>e+(n=>{if(n._$cssResult$===!0)return n.cssText;if(typeof n=="number")return n;throw Error("Value passed to 'css' function must be a 'css' function result: "+n+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(i)+o[r+1],o[0]);return new K(t,o,bt)},It=(o,s)=>{if(dt)o.adoptedStyleSheets=s.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(let t of s){let e=document.createElement("style"),i=lt.litNonce;i!==void 0&&e.setAttribute("nonce",i),e.textContent=t.cssText,o.appendChild(e)}},yt=dt?o=>o:o=>o instanceof CSSStyleSheet?(s=>{let t="";for(let e of s.cssRules)t+=e.cssText;return Ct(t)})(o):o;var{is:ae,defineProperty:oe,getOwnPropertyDescriptor:le,getOwnPropertyNames:de,getOwnPropertySymbols:ce,getPrototypeOf:pe}=Object,ct=globalThis,Ht=ct.trustedTypes,ue=Ht?Ht.emptyScript:"",he=ct.reactiveElementPolyfillSupport,W=(o,s)=>o,G={toAttribute(o,s){switch(s){case Boolean:o=o?ue:null;break;case Object:case Array:o=o==null?o:JSON.stringify(o)}return o},fromAttribute(o,s){let t=o;switch(s){case Boolean:t=o!==null;break;case Number:t=o===null?null:Number(o);break;case Object:case Array:try{t=JSON.parse(o)}catch{t=null}}return t}},pt=(o,s)=>!ae(o,s),Ut={attribute:!0,type:String,converter:G,reflect:!1,useDefault:!1,hasChanged:pt};Symbol.metadata??=Symbol("metadata"),ct.litPropertyMetadata??=new WeakMap;var A=class extends HTMLElement{static addInitializer(s){this._$Ei(),(this.l??=[]).push(s)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(s,t=Ut){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(s)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(s,t),!t.noAccessor){let e=Symbol(),i=this.getPropertyDescriptor(s,e,t);i!==void 0&&oe(this.prototype,s,i)}}static getPropertyDescriptor(s,t,e){let{get:i,set:r}=le(this.prototype,s)??{get(){return this[t]},set(n){this[t]=n}};return{get:i,set(n){let l=i?.call(this);r?.call(this,n),this.requestUpdate(s,l,e)},configurable:!0,enumerable:!0}}static getPropertyOptions(s){return this.elementProperties.get(s)??Ut}static _$Ei(){if(this.hasOwnProperty(W("elementProperties")))return;let s=pe(this);s.finalize(),s.l!==void 0&&(this.l=[...s.l]),this.elementProperties=new Map(s.elementProperties)}static finalize(){if(this.hasOwnProperty(W("finalized")))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(W("properties"))){let t=this.properties,e=[...de(t),...ce(t)];for(let i of e)this.createProperty(i,t[i])}let s=this[Symbol.metadata];if(s!==null){let t=litPropertyMetadata.get(s);if(t!==void 0)for(let[e,i]of t)this.elementProperties.set(e,i)}this._$Eh=new Map;for(let[t,e]of this.elementProperties){let i=this._$Eu(t,e);i!==void 0&&this._$Eh.set(i,t)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(s){let t=[];if(Array.isArray(s)){let e=new Set(s.flat(1/0).reverse());for(let i of e)t.unshift(yt(i))}else s!==void 0&&t.push(yt(s));return t}static _$Eu(s,t){let e=t.attribute;return e===!1?void 0:typeof e=="string"?e:typeof s=="string"?s.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(s=>this.enableUpdating=s),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(s=>s(this))}addController(s){(this._$EO??=new Set).add(s),this.renderRoot!==void 0&&this.isConnected&&s.hostConnected?.()}removeController(s){this._$EO?.delete(s)}_$E_(){let s=new Map,t=this.constructor.elementProperties;for(let e of t.keys())this.hasOwnProperty(e)&&(s.set(e,this[e]),delete this[e]);s.size>0&&(this._$Ep=s)}createRenderRoot(){let s=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return It(s,this.constructor.elementStyles),s}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(s=>s.hostConnected?.())}enableUpdating(s){}disconnectedCallback(){this._$EO?.forEach(s=>s.hostDisconnected?.())}attributeChangedCallback(s,t,e){this._$AK(s,e)}_$ET(s,t){let e=this.constructor.elementProperties.get(s),i=this.constructor._$Eu(s,e);if(i!==void 0&&e.reflect===!0){let r=(e.converter?.toAttribute!==void 0?e.converter:G).toAttribute(t,e.type);this._$Em=s,r==null?this.removeAttribute(i):this.setAttribute(i,r),this._$Em=null}}_$AK(s,t){let e=this.constructor,i=e._$Eh.get(s);if(i!==void 0&&this._$Em!==i){let r=e.getPropertyOptions(i),n=typeof r.converter=="function"?{fromAttribute:r.converter}:r.converter?.fromAttribute!==void 0?r.converter:G;this._$Em=i;let l=n.fromAttribute(t,r.type);this[i]=l??this._$Ej?.get(i)??l,this._$Em=null}}requestUpdate(s,t,e,i=!1,r){if(s!==void 0){let n=this.constructor;if(i===!1&&(r=this[s]),e??=n.getPropertyOptions(s),!((e.hasChanged??pt)(r,t)||e.useDefault&&e.reflect&&r===this._$Ej?.get(s)&&!this.hasAttribute(n._$Eu(s,e))))return;this.C(s,t,e)}this.isUpdatePending===!1&&(this._$ES=this._$EP())}C(s,t,{useDefault:e,reflect:i,wrapped:r},n){e&&!(this._$Ej??=new Map).has(s)&&(this._$Ej.set(s,n??t??this[s]),r!==!0||n!==void 0)||(this._$AL.has(s)||(this.hasUpdated||e||(t=void 0),this._$AL.set(s,t)),i===!0&&this._$Em!==s&&(this._$Eq??=new Set).add(s))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(t){Promise.reject(t)}let s=this.scheduleUpdate();return s!=null&&await s,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[i,r]of this._$Ep)this[i]=r;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[i,r]of e){let{wrapped:n}=r,l=this[i];n!==!0||this._$AL.has(i)||l===void 0||this.C(i,void 0,r,l)}}let s=!1,t=this._$AL;try{s=this.shouldUpdate(t),s?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(e){throw s=!1,this._$EM(),e}s&&this._$AE(t)}willUpdate(s){}_$AE(s){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(s)),this.updated(s)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(s){return!0}update(s){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM()}updated(s){}firstUpdated(s){}};A.elementStyles=[],A.shadowRootOptions={mode:"open"},A[W("elementProperties")]=new Map,A[W("finalized")]=new Map,he?.({ReactiveElement:A}),(ct.reactiveElementVersions??=[]).push("2.1.2");var St=globalThis,qt=o=>o,ut=St.trustedTypes,Ft=ut?ut.createPolicy("lit-html",{createHTML:o=>o}):void 0,Zt="$lit$",T=`lit$${Math.random().toFixed(9).slice(2)}$`,Yt="?"+T,me=`<${Yt}>`,B=document,J=()=>B.createComment(""),Z=o=>o===null||typeof o!="object"&&typeof o!="function",At=Array.isArray,ge=o=>At(o)||typeof o?.[Symbol.iterator]=="function",$t=`[ 	
\f\r]`,V=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,Kt=/-->/g,Wt=/>/g,P=RegExp(`>|${$t}(?:([^\\s"'>=/]+)(${$t}*=${$t}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`,"g"),Gt=/'/g,Vt=/"/g,Xt=/^(?:script|style|textarea|title)$/i,Dt=o=>(s,...t)=>({_$litType$:o,strings:s,values:t}),a=Dt(1),Re=Dt(2),Ne=Dt(3),O=Symbol.for("lit-noChange"),d=Symbol.for("lit-nothing"),Jt=new WeakMap,M=B.createTreeWalker(B,129);function Qt(o,s){if(!At(o)||!o.hasOwnProperty("raw"))throw Error("invalid template strings array");return Ft!==void 0?Ft.createHTML(s):s}var fe=(o,s)=>{let t=o.length-1,e=[],i,r=s===2?"<svg>":s===3?"<math>":"",n=V;for(let l=0;l<t;l++){let c=o[l],p,u,f=-1,b=0;for(;b<c.length&&(n.lastIndex=b,u=n.exec(c),u!==null);)b=n.lastIndex,n===V?u[1]==="!--"?n=Kt:u[1]!==void 0?n=Wt:u[2]!==void 0?(Xt.test(u[2])&&(i=RegExp("</"+u[2],"g")),n=P):u[3]!==void 0&&(n=P):n===P?u[0]===">"?(n=i??V,f=-1):u[1]===void 0?f=-2:(f=n.lastIndex-u[2].length,p=u[1],n=u[3]===void 0?P:u[3]==='"'?Vt:Gt):n===Vt||n===Gt?n=P:n===Kt||n===Wt?n=V:(n=P,i=void 0);let E=n===P&&o[l+1].startsWith("/>")?" ":"";r+=n===V?c+me:f>=0?(e.push(p),c.slice(0,f)+Zt+c.slice(f)+T+E):c+T+(f===-2?l:E)}return[Qt(o,r+(o[t]||"<?>")+(s===2?"</svg>":s===3?"</math>":"")),e]},Y=class o{constructor({strings:s,_$litType$:t},e){let i;this.parts=[];let r=0,n=0,l=s.length-1,c=this.parts,[p,u]=fe(s,t);if(this.el=o.createElement(p,e),M.currentNode=this.el.content,t===2||t===3){let f=this.el.content.firstChild;f.replaceWith(...f.childNodes)}for(;(i=M.nextNode())!==null&&c.length<l;){if(i.nodeType===1){if(i.hasAttributes())for(let f of i.getAttributeNames())if(f.endsWith(Zt)){let b=u[n++],E=i.getAttribute(f).split(T),ot=/([.?@])?(.*)/.exec(b);c.push({type:1,index:r,name:ot[2],strings:E,ctor:ot[1]==="."?_t:ot[1]==="?"?xt:ot[1]==="@"?wt:H}),i.removeAttribute(f)}else f.startsWith(T)&&(c.push({type:6,index:r}),i.removeAttribute(f));if(Xt.test(i.tagName)){let f=i.textContent.split(T),b=f.length-1;if(b>0){i.textContent=ut?ut.emptyScript:"";for(let E=0;E<b;E++)i.append(f[E],J()),M.nextNode(),c.push({type:2,index:++r});i.append(f[b],J())}}}else if(i.nodeType===8)if(i.data===Yt)c.push({type:2,index:r});else{let f=-1;for(;(f=i.data.indexOf(T,f+1))!==-1;)c.push({type:7,index:r}),f+=T.length-1}r++}}static createElement(s,t){let e=B.createElement("template");return e.innerHTML=s,e}};function I(o,s,t=o,e){if(s===O)return s;let i=e!==void 0?t._$Co?.[e]:t._$Cl,r=Z(s)?void 0:s._$litDirective$;return i?.constructor!==r&&(i?._$AO?.(!1),r===void 0?i=void 0:(i=new r(o),i._$AT(o,t,e)),e!==void 0?(t._$Co??=[])[e]=i:t._$Cl=i),i!==void 0&&(s=I(o,i._$AS(o,s.values),i,e)),s}var kt=class{constructor(s,t){this._$AV=[],this._$AN=void 0,this._$AD=s,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(s){let{el:{content:t},parts:e}=this._$AD,i=(s?.creationScope??B).importNode(t,!0);M.currentNode=i;let r=M.nextNode(),n=0,l=0,c=e[0];for(;c!==void 0;){if(n===c.index){let p;c.type===2?p=new X(r,r.nextSibling,this,s):c.type===1?p=new c.ctor(r,c.name,c.strings,this,s):c.type===6&&(p=new Et(r,this,s)),this._$AV.push(p),c=e[++l]}n!==c?.index&&(r=M.nextNode(),n++)}return M.currentNode=B,i}p(s){let t=0;for(let e of this._$AV)e!==void 0&&(e.strings!==void 0?(e._$AI(s,e,t),t+=e.strings.length-2):e._$AI(s[t])),t++}},X=class o{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(s,t,e,i){this.type=2,this._$AH=d,this._$AN=void 0,this._$AA=s,this._$AB=t,this._$AM=e,this.options=i,this._$Cv=i?.isConnected??!0}get parentNode(){let s=this._$AA.parentNode,t=this._$AM;return t!==void 0&&s?.nodeType===11&&(s=t.parentNode),s}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(s,t=this){s=I(this,s,t),Z(s)?s===d||s==null||s===""?(this._$AH!==d&&this._$AR(),this._$AH=d):s!==this._$AH&&s!==O&&this._(s):s._$litType$!==void 0?this.$(s):s.nodeType!==void 0?this.T(s):ge(s)?this.k(s):this._(s)}O(s){return this._$AA.parentNode.insertBefore(s,this._$AB)}T(s){this._$AH!==s&&(this._$AR(),this._$AH=this.O(s))}_(s){this._$AH!==d&&Z(this._$AH)?this._$AA.nextSibling.data=s:this.T(B.createTextNode(s)),this._$AH=s}$(s){let{values:t,_$litType$:e}=s,i=typeof e=="number"?this._$AC(s):(e.el===void 0&&(e.el=Y.createElement(Qt(e.h,e.h[0]),this.options)),e);if(this._$AH?._$AD===i)this._$AH.p(t);else{let r=new kt(i,this),n=r.u(this.options);r.p(t),this.T(n),this._$AH=r}}_$AC(s){let t=Jt.get(s.strings);return t===void 0&&Jt.set(s.strings,t=new Y(s)),t}k(s){At(this._$AH)||(this._$AH=[],this._$AR());let t=this._$AH,e,i=0;for(let r of s)i===t.length?t.push(e=new o(this.O(J()),this.O(J()),this,this.options)):e=t[i],e._$AI(r),i++;i<t.length&&(this._$AR(e&&e._$AB.nextSibling,i),t.length=i)}_$AR(s=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);s!==this._$AB;){let e=qt(s).nextSibling;qt(s).remove(),s=e}}setConnected(s){this._$AM===void 0&&(this._$Cv=s,this._$AP?.(s))}},H=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(s,t,e,i,r){this.type=1,this._$AH=d,this._$AN=void 0,this.element=s,this.name=t,this._$AM=i,this.options=r,e.length>2||e[0]!==""||e[1]!==""?(this._$AH=Array(e.length-1).fill(new String),this.strings=e):this._$AH=d}_$AI(s,t=this,e,i){let r=this.strings,n=!1;if(r===void 0)s=I(this,s,t,0),n=!Z(s)||s!==this._$AH&&s!==O,n&&(this._$AH=s);else{let l=s,c,p;for(s=r[0],c=0;c<r.length-1;c++)p=I(this,l[e+c],t,c),p===O&&(p=this._$AH[c]),n||=!Z(p)||p!==this._$AH[c],p===d?s=d:s!==d&&(s+=(p??"")+r[c+1]),this._$AH[c]=p}n&&!i&&this.j(s)}j(s){s===d?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,s??"")}},_t=class extends H{constructor(){super(...arguments),this.type=3}j(s){this.element[this.name]=s===d?void 0:s}},xt=class extends H{constructor(){super(...arguments),this.type=4}j(s){this.element.toggleAttribute(this.name,!!s&&s!==d)}},wt=class extends H{constructor(s,t,e,i,r){super(s,t,e,i,r),this.type=5}_$AI(s,t=this){if((s=I(this,s,t,0)??d)===O)return;let e=this._$AH,i=s===d&&e!==d||s.capture!==e.capture||s.once!==e.once||s.passive!==e.passive,r=s!==d&&(e===d||i);i&&this.element.removeEventListener(this.name,this,e),r&&this.element.addEventListener(this.name,this,s),this._$AH=s}handleEvent(s){typeof this._$AH=="function"?this._$AH.call(this.options?.host??this.element,s):this._$AH.handleEvent(s)}},Et=class{constructor(s,t,e){this.element=s,this.type=6,this._$AN=void 0,this._$AM=t,this.options=e}get _$AU(){return this._$AM._$AU}_$AI(s){I(this,s)}};var ve=St.litHtmlPolyfillSupport;ve?.(Y,X),(St.litHtmlVersions??=[]).push("3.3.3");var te=(o,s,t)=>{let e=t?.renderBefore??s,i=e._$litPart$;if(i===void 0){let r=t?.renderBefore??null;e._$litPart$=i=new X(s.insertBefore(J(),r),r,void 0,t??{})}return i._$AI(o),i};var zt=globalThis,_=class extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let s=super.createRenderRoot();return this.renderOptions.renderBefore??=s.firstChild,s}update(s){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(s),this._$Do=te(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return O}};_._$litElement$=!0,_.finalized=!0,zt.litElementHydrateSupport?.({LitElement:_});var be=zt.litElementPolyfillSupport;be?.({LitElement:_});(zt.litElementVersions??=[]).push("4.2.2");var ye={attribute:!0,type:String,converter:G,reflect:!1,hasChanged:pt},$e=(o=ye,s,t)=>{let{kind:e,metadata:i}=t,r=globalThis.litPropertyMetadata.get(i);if(r===void 0&&globalThis.litPropertyMetadata.set(i,r=new Map),e==="setter"&&((o=Object.create(o)).wrapped=!0),r.set(t.name,o),e==="accessor"){let{name:n}=t;return{set(l){let c=s.get.call(this);s.set.call(this,l),this.requestUpdate(n,c,o,!0,l)},init(l){return l!==void 0&&this.C(n,void 0,o,l),l}}}if(e==="setter"){let{name:n}=t;return function(l){let c=this[n];s.call(this,l),this.requestUpdate(n,c,o,!0,l)}}throw Error("Unsupported decorator location: "+e)};function y(o){return(s,t)=>typeof t=="object"?$e(o,s,t):((e,i,r)=>{let n=i.hasOwnProperty(r);return i.constructor.createProperty(r,e),n?Object.getOwnPropertyDescriptor(i,r):void 0})(o,s,t)}function g(o){return y({...o,state:!0,attribute:!1})}var mt=class{constructor(s,t){this.hass=s;this.ui=t}async op(s,t={}){try{return(await this.hass.callWS({type:"umbau_planer/op",op:s,args:t})).result}catch(e){this.ui.toast(e?.message??String(e),{kind:"error"});return}}async ws(s,t={}){try{return await this.hass.callWS({type:`umbau_planer/${s}`,...t})}catch(e){this.ui.toast(e?.message??String(e),{kind:"error"});return}}fetchState(){return this.hass.callWS({type:"umbau_planer/state"})}};function h(o){if(o==null)return"\u2013";let s=o<0?"\u2212":"",t=Math.abs(Math.round(o)),e=Math.floor(t/60),i=t%60;return e===0?`${s}${i} min`:i===0?`${s}${e} h`:`${s}${e} h ${i} min`}function x(o){if(o==null)return"\u2013";let s=Math.round(o/60*10)/10;return`${String(s).replace(".",",")} h`}function Q(o){return o==null?"\u2013":`${o>0?"+":""}${h(o)}`}function S(o){let s=o.trim().toLowerCase().replace(",",".");if(!s)return null;let t=s.match(/^(\d+):(\d{1,2})$/);return t?parseInt(t[1])*60+parseInt(t[2]):(t=s.match(/^(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*(?:m|min))?$/),t&&(t[1]||t[2])?Math.round(parseFloat(t[1]||"0")*60+parseInt(t[2]||"0")):(t=s.match(/^\d+\.\d+$/),t?Math.round(parseFloat(s)*60):(t=s.match(/^\d+$/),t?parseInt(s):NaN)))}var ke=["So","Mo","Di","Mi","Do","Fr","Sa"];function w(o){let[s,t,e]=o.split("-").map(Number);return new Date(s,t-1,e)}function tt(o){let s=t=>String(t).padStart(2,"0");return`${o.getFullYear()}-${s(o.getMonth()+1)}-${s(o.getDate())}`}function D(o,s){let t=w(o);return t.setDate(t.getDate()+s),tt(t)}function gt(o,s){let t=w(o),e=`${ke[t.getDay()]}, ${t.getDate()}.${t.getMonth()+1}.`;return s===o?`Heute (${e})`:s&&D(s,1)===o?`Morgen (${e})`:e}function et(o){let s=w(o),t=(s.getDay()+6)%7;return s.setDate(s.getDate()-t),tt(s)}function Tt(o,s){return new Date(o).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit",timeZone:s})}function it(o,s){return new Intl.DateTimeFormat("sv-SE",{timeZone:s,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(o)).replace(" ","T")}function Pt(o,s){let t=new Date(o+":00Z"),e=it(t.toISOString(),s),r=new Date(e+":00Z").getTime()-t.getTime();return new Date(t.getTime()-r).toISOString()}function ee(){let o=globalThis.crypto;if(o&&typeof o.randomUUID=="function")return o.randomUUID();let s=new Uint8Array(16);if(o&&typeof o.getRandomValues=="function")o.getRandomValues(s);else for(let e=0;e<16;e++)s[e]=Math.floor(Math.random()*256);s[6]=s[6]&15|64,s[8]=s[8]&63|128;let t=[...s].map(e=>e.toString(16).padStart(2,"0")).join("");return`${t.slice(0,8)}-${t.slice(8,12)}-${t.slice(12,16)}-${t.slice(16,20)}-${t.slice(20)}`}var U=$`
  :host {
    display: block;
    color: var(--primary-text-color);
    font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
    font-size: 14px;
  }
  * {
    box-sizing: border-box;
  }
  h2 {
    font-size: 18px;
    font-weight: 500;
    margin: 4px 0 8px;
  }
  h3 {
    font-size: 15px;
    font-weight: 500;
    margin: 12px 0 6px;
  }
  .muted {
    color: var(--secondary-text-color);
  }
  .small {
    font-size: 12px;
  }
  .right {
    margin-left: auto;
  }
  .card {
    background: var(--card-background-color, #fff);
    border-radius: var(--ha-card-border-radius, 12px);
    border: 1px solid var(--divider-color);
    padding: 10px 12px;
    margin: 0 0 10px;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .row.nowrap {
    flex-wrap: nowrap;
  }
  .grow {
    flex: 1 1 0;
    min-width: 0;
  }
  button,
  .btn {
    font: inherit;
    cursor: pointer;
    border: 1px solid var(--divider-color);
    background: var(--secondary-background-color, #f3f3f3);
    color: var(--primary-text-color);
    border-radius: 8px;
    padding: 6px 10px;
    min-height: 34px;
  }
  button:hover {
    filter: brightness(0.96);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button.primary {
    background: var(--primary-color);
    color: var(--text-primary-color, #fff);
    border-color: var(--primary-color);
  }
  button.danger {
    color: var(--error-color, #db4437);
    border-color: var(--error-color, #db4437);
  }
  button.icon {
    padding: 2px 8px;
    min-width: 34px;
  }
  button.link {
    border: none;
    background: none;
    padding: 2px 4px;
    color: var(--primary-color);
  }
  input,
  select,
  textarea {
    font: inherit;
    color: var(--primary-text-color);
    background: var(--card-background-color, #fff);
    border: 1px solid var(--divider-color);
    border-radius: 8px;
    padding: 6px 8px;
    min-height: 34px;
    max-width: 100%;
  }
  input:focus,
  select:focus,
  textarea:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: -1px;
  }
  textarea {
    width: 100%;
    min-height: 60px;
  }
  input.inline {
    border-color: transparent;
    background: transparent;
    padding: 2px 4px;
    min-height: 28px;
  }
  input.inline:hover,
  input.inline:focus {
    border-color: var(--divider-color);
    background: var(--card-background-color, #fff);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    border-radius: 999px;
    padding: 1px 8px;
    font-size: 12px;
    line-height: 20px;
    background: var(--secondary-background-color, #eee);
    border: 1px solid var(--divider-color);
    white-space: nowrap;
  }
  .chip.ok {
    background: color-mix(in srgb, var(--success-color, #43a047) 20%, transparent);
    border-color: var(--success-color, #43a047);
  }
  .chip.warn {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 25%, transparent);
    border-color: var(--warning-color, #ffa600);
  }
  .chip.err {
    background: color-mix(in srgb, var(--error-color, #db4437) 20%, transparent);
    border-color: var(--error-color, #db4437);
  }
  .chip.inherited {
    font-style: italic;
    opacity: 0.7;
    border-style: dashed;
  }
  .bar {
    height: 10px;
    border-radius: 6px;
    background: var(--secondary-background-color, #e0e0e0);
    overflow: hidden;
    position: relative;
    min-width: 80px;
  }
  .bar > span {
    display: block;
    height: 100%;
    background: var(--primary-color);
  }
  .bar.over > span {
    background: var(--error-color, #db4437);
  }
  .warning-box {
    background: color-mix(in srgb, var(--warning-color, #ffa600) 18%, transparent);
    border-left: 4px solid var(--warning-color, #ffa600);
    padding: 6px 10px;
    border-radius: 6px;
    margin: 6px 0;
    font-size: 13px;
  }
  .error-box {
    background: color-mix(in srgb, var(--error-color, #db4437) 15%, transparent);
    border-left: 4px solid var(--error-color, #db4437);
    padding: 6px 10px;
    border-radius: 6px;
    margin: 6px 0;
  }
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: 4px 6px;
    border-bottom: 1px solid var(--divider-color);
    vertical-align: top;
  }
  th {
    font-weight: 500;
    font-size: 12px;
    color: var(--secondary-text-color);
  }
  td.num,
  th.num {
    text-align: right;
    white-space: nowrap;
  }
  .scroll-x {
    overflow-x: auto;
  }
  .empty {
    padding: 24px;
    text-align: center;
    color: var(--secondary-text-color);
  }
  .drop-target {
    outline: 2px dashed var(--primary-color);
    outline-offset: -2px;
  }
`;function _e(o){return o==null?"":`${Math.floor(o/60)}:${String(o%60).padStart(2,"0")}`}var z=class extends _{constructor(){super(...arguments);this.tasks=[];this.vals={};this.errors={};this.initial=""}static{this.styles=[U,$`
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
      }
      .dialog {
        background: var(--card-background-color, #fff);
        color: var(--primary-text-color);
        border-radius: 14px;
        padding: 16px;
        width: min(520px, 100%);
        max-height: 92vh;
        overflow: auto;
      }
      label {
        display: block;
        margin: 8px 0 2px;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
      .field input:not([type="checkbox"]),
      .field select {
        width: 100%;
      }
      .checks label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin: 2px 10px 2px 0;
        font-size: 14px;
        color: var(--primary-text-color);
      }
      .buttons {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
        margin-top: 16px;
        flex-wrap: wrap;
      }
      .err {
        color: var(--error-color, #db4437);
        font-size: 12px;
      }
      p.message {
        white-space: pre-line;
        margin: 4px 0;
      }
    `]}willUpdate(t){if(t.has("spec")){let e={};for(let i of this.spec.fields??[]){let r=this.spec.values?.[i.key];i.type==="duration"?e[i.key]=_e(r):i.type==="checks"?e[i.key]=[...r??[]]:i.type==="checkbox"?e[i.key]=!!r:e[i.key]=r??""}this.vals=e,this.initial=JSON.stringify(e),this.errors={}}}set(t,e){this.vals={...this.vals,[t]:e},this.dirtyChanged?.(JSON.stringify(this.vals)!==this.initial)}close(t){this.dirtyChanged?.(!1),this.done(t)}submit(t){let e={},i={};for(let r of this.spec.fields??[]){let n=this.vals[r.key];if(r.type==="duration"){let l=S(String(n));l!==null&&Number.isNaN(l)&&(i[r.key]="Ung\xFCltige Dauer, z. B. 1:30 oder 90 min"),e[r.key]=l}else if(r.type==="number")e[r.key]=n===""?null:Number(n);else if(r.type==="select"){let l=r.options?.find(c=>String(c.value)===String(n));e[r.key]=l?l.value:n===""?null:n}else r.type==="task"?e[r.key]=n||null:r.type==="text"||r.type==="textarea"?e[r.key]=String(n).trim():e[r.key]=n===""?null:n;r.required&&(e[r.key]===null||e[r.key]===""||e[r.key]===void 0)&&(i[r.key]="Pflichtfeld")}if(Object.keys(i).length&&t!=="cancel"){this.errors=i;return}this.close({action:t,values:e})}field(t){let e=this.vals[t.key],i=this.errors[t.key],r;switch(t.type){case"textarea":r=a`<textarea .value=${e} @input=${n=>this.set(t.key,n.target.value)}></textarea>`;break;case"select":r=a`<select .value=${String(e)} @change=${n=>this.set(t.key,n.target.value)}>
          ${t.allowEmpty?a`<option value="">–</option>`:d}
          ${(t.options??[]).map(n=>a`<option value=${String(n.value)} ?selected=${String(n.value)===String(e)}>${n.label}</option>`)}
        </select>`;break;case"task":{let n=this.tasks.filter(l=>t.taskFilter?t.taskFilter(l):!0);r=a`<select .value=${e} @change=${l=>this.set(t.key,l.target.value)}>
          <option value="">${t.allowEmpty===!1?"bitte w\xE4hlen":"\u2013"}</option>
          ${n.map(l=>a`<option value=${l.id} ?selected=${l.id===e}>${"\u2003".repeat(l.depth)}${l.title}</option>`)}
        </select>`;break}case"checkbox":return a`<div class="field">
          <label style="display:flex;gap:6px;align-items:center;color:var(--primary-text-color);font-size:14px">
            <input type="checkbox" .checked=${e} @change=${n=>this.set(t.key,n.target.checked)} />
            ${t.label}
          </label>
        </div>`;case"checks":r=a`<div class="checks">
          ${(t.options??[]).map(n=>a`<label>
              <input
                type="checkbox"
                .checked=${e.includes(n.value)}
                @change=${l=>this.set(t.key,l.target.checked?[...e,n.value]:e.filter(c=>c!==n.value))}
              />${n.label}</label
            >`)}
        </div>`;break;default:{let n=t.type==="datetime"?"datetime-local":t.type==="duration"?"text":t.type;r=a`<input
          type=${n}
          .value=${e}
          placeholder=${t.placeholder??(t.type==="duration"?"z. B. 1:30, 1,5 h, 90 min":"")}
          @input=${l=>this.set(t.key,l.target.value)}
          @keydown=${l=>l.key==="Enter"&&t.type!=="textarea"&&this.submit("ok")}
        />`}}return a`<div class="field">
      <label>${t.label}${t.required?" *":""}</label>
      ${r} ${t.hint?a`<div class="muted small">${t.hint}</div>`:d}
      ${i?a`<div class="err">${i}</div>`:d}
    </div>`}render(){return this.spec?a`<div class="backdrop" @click=${t=>t.target===t.currentTarget&&this.close(null)}>
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>${this.spec.title}</h2>
        ${this.spec.message?a`<p class="message">${this.spec.message}</p>`:d}
        ${(this.spec.fields??[]).map(t=>this.field(t))}
        <div class="buttons">
          <button @click=${()=>this.close(null)}>Abbrechen</button>
          ${(this.spec.actions??[]).map(t=>a`<button class=${t.danger?"danger":""} @click=${()=>this.submit(t.name)}>${t.label}</button>`)}
          <button class=${this.spec.danger?"danger":"primary"} @click=${()=>this.submit("ok")}>
            ${this.spec.submitLabel??"OK"}
          </button>
        </div>
      </div>
    </div>`:d}};m([y({attribute:!1})],z.prototype,"spec",2),m([y({attribute:!1})],z.prototype,"tasks",2),m([y({attribute:!1})],z.prototype,"done",2),m([y({attribute:!1})],z.prototype,"dirtyChanged",2),m([g()],z.prototype,"vals",2),m([g()],z.prototype,"errors",2);customElements.define("up-form-dialog",z);var v=class extends _{constructor(){super(...arguments);this._byId=new Map;this._children=new Map}static{this.styles=[U]}_index(){if(this._cacheState!==this.st){this._cacheState=this.st,this._byId=new Map(this.st.tasks.map(t=>[t.id,t])),this._children=new Map;for(let t of this.st.tasks){let e=this._children.get(t.parent_id)??[];e.push(t),this._children.set(t.parent_id,e)}}}task(t){return this._index(),t?this._byId.get(t):void 0}childrenOf(t){return this._index(),this._children.get(t)??[]}ttl(t){return this.task(t)?.title??"?"}projectTitle(t){let e=this.task(t);return e?this.ttl(e.project_id):"?"}get canEdit(){return this.st.me.can_edit}get persons(){return this.st.settings.persons}get levels(){return this.st.settings.level_names}blockById(t){return this.st.blocks.find(e=>e.id===t)}entriesOf(t){return this.st.entries.filter(e=>e.block_id===t).sort((e,i)=>e.order-i.order)}listEntries(t){return this.st.entries.filter(e=>e.block_id===null&&e.list===t).sort((e,i)=>e.order-i.order)}reasonText(t){return t.reasons.map(e=>{let i=e.via_title?` (\xFCber \u201E${e.via_title}\u201C)`:"";return e.kind==="waiting"?`wartet auf ${e.text}${e.until?` bis ${e.until}`:""}${i}`:e.kind==="sequence"?`\u201E${e.title}\u201C muss zuerst erledigt werden${i}`:`blockiert durch \u201E${e.title}\u201C${i}`}).join("; ")}async startTimer(t){let e=this.task(t);e&&!e.ready&&e.status!=="done"&&e.status!=="discarded"&&e.reasons.length&&this.api.ui.toast(`Hinweis: ${this.reasonText(e)}`,{kind:"warn",timeout:6e3});let i=this.st.timer.running;(await this.api.op("timer_start",{task_id:t}))?.can_undo&&i&&this.api.ui.toast(`Gewechselt zu \u201E${this.ttl(t)}\u201C`,{action:{label:"R\xFCckg\xE4ngig",run:()=>void this.api.op("timer_undo_switch")},timeout:8e3})}};m([y({attribute:!1})],v.prototype,"st",2),m([y({attribute:!1})],v.prototype,"api",2);function xe(o){return`${Math.floor(o/60)}:${String(o%60).padStart(2,"0")}`}var R=class extends v{constructor(){super(...arguments);this.preview=null;this.answers={};this.busy=!1}static{this.styles=[...v.styles,$`
      .backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 20;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 8px;
      }
      .dialog {
        background: var(--card-background-color, #fff);
        border-radius: 14px;
        padding: 16px;
        width: min(760px, 100%);
        max-height: 94vh;
        overflow: auto;
      }
      .cols {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      @media (max-width: 560px) {
        .cols {
          grid-template-columns: 1fr;
        }
      }
      .col h4 {
        margin: 4px 0;
      }
      .item {
        font-size: 13px;
        padding: 2px 0;
        border-bottom: 1px dashed var(--divider-color);
      }
      .item.sup {
        opacity: 0.6;
      }
      input.dur {
        width: 80px;
        text-align: right;
      }
    `]}connectedCallback(){super.connectedCallback(),this.refresh(!0)}parsedAnswers(){let t={};for(let[e,i]of Object.entries(this.answers)){let r=S(i);if(r===null||Number.isNaN(r)||r<0)return this.api.ui.toast("Ung\xFCltige Restzeit, z. B. 1:30 oder 90 min",{kind:"error"}),null;t[e]=r}return t}async refresh(t=!1){let e=t?{}:this.parsedAnswers();if(e===null)return;let i=await this.api.ws("rollover_preview",{remaining:e});if(!i)return this.done();this.preview=i,t&&(this.answers=Object.fromEntries(i.affected.map(r=>[r.task_id,xe(r.remaining_min)])))}async apply(){let t=this.parsedAnswers();if(t===null)return;this.busy=!0;let e=await this.api.op("rollover_apply",{remaining:t});this.busy=!1,e&&this.api.ui.toast("Nachger\xFCckt",{action:{label:"R\xFCckg\xE4ngig",run:()=>void this.api.op("rollover_undo")},timeout:12e3}),this.done()}label(t){if(t==="unscheduled")return"Nicht eingeplant";if(t==="reschedule")return"Neu terminieren";let e=this.blockById(t);return e?`${e.date}${e.start_time?" "+e.start_time:""}${e.note?" \u2013 "+e.note:""}`:t}column(t,e,i){let r=e[i]??[];return a`<div class="col">
      <h4>${t}</h4>
      ${r.length?r.map(n=>a`<div class="item ${n.superseded?"sup":""}">${n.fixed?"\u{1F4CC} ":""}${n.title} – ${h(n.planned_min)}${n.superseded?" (nachger\xFCckt)":""}</div>`):a`<div class="muted small">leer</div>`}
    </div>`}render(){let t=this.preview,e=t?Object.keys(t.after).filter(i=>JSON.stringify(t.before[i]?.map(r=>[r.task_id,r.planned_min,r.superseded]))!==JSON.stringify(t.after[i]?.map(r=>[r.task_id,r.planned_min,r.superseded]))):[];return a`<div class="backdrop">
      <div class="dialog" role="dialog" aria-modal="true">
        <h2>Nachrücken</h2>
        ${t?a`
              <div class="muted small">
                Unerledigtes aus vergangenen und abgeschlossenen Blöcken wird vor die noch offenen Einträge gestellt und ab dem nächsten
                offenen Block neu verteilt. Fixierte Einträge und reservierte Blöcke bleiben unberührt.
              </div>
              ${t.affected.length?a`<h3>Restzeit der betroffenen Aufgaben</h3>
                    ${t.affected.map(i=>a`<div class="row" style="margin:3px 0">
                        <span class="grow">${i.title}</span>
                        <input
                          class="dur"
                          .value=${this.answers[i.task_id]??""}
                          @input=${r=>this.answers={...this.answers,[i.task_id]:r.target.value}}
                          title="Restzeit – aktualisiert die Restschätzung der Aufgabe"
                        />
                      </div>`)}
                    <div class="row"><button @click=${()=>this.refresh()}>Vorschau aktualisieren</button></div>`:a`<div class="muted" style="margin:8px 0">Es gibt keine unerledigten Einträge in vergangenen Blöcken. Offene Einträge werden trotzdem neu verteilt.</div>`}
              ${t.warnings.length?a`<div class="warning-box">
                    ${t.warnings.map(i=>a`<div>⚠ „${i.task_title}“ (fixiert${i.date?" am "+i.date:""}): Voraussetzung „${i.prerequisite_title}“ würde hinter den Termin rutschen.</div>`)}
                  </div>`:d}
              ${t.removed.length?a`<div class="muted small">${t.removed.length} Eintrag/Einträge erledigter Aufgaben werden entfernt.</div>`:d}
              <h3>Plan vorher und nachher</h3>
              ${e.length?e.map(i=>a`<div class="card"><b>${this.label(i)}</b>
                      <div class="cols">${this.column("Vorher",t.before,i)}${this.column("Nachher",t.after,i)}</div></div>`):a`<div class="muted">Der Plan ändert sich nicht.</div>`}
              <div class="row" style="justify-content:flex-end;margin-top:12px">
                <button @click=${()=>this.done()}>Abbrechen</button>
                <button class="primary" ?disabled=${this.busy} @click=${()=>this.apply()}>Nachrücken anwenden</button>
              </div>
            `:a`<div class="muted">Lade …</div>`}
      </div>
    </div>`}};m([y({attribute:!1})],R.prototype,"done",2),m([g()],R.prototype,"preview",2),m([g()],R.prototype,"answers",2),m([g()],R.prototype,"busy",2);customElements.define("up-rollover-dialog",R);var we={not_planned:"ist nicht eingeplant",fixed_after:"liegt erst nach diesem Termin",order:"liegt im Plan erst danach"},q=class extends v{constructor(){super(...arguments);this.readonly=!1;this.more=!1}static{this.styles=[...v.styles,$`
      :host {
        display: block;
      }
      .entry {
        border: 1px solid var(--divider-color);
        border-radius: 8px;
        padding: 4px 8px;
        margin: 4px 0;
        background: var(--card-background-color, #fff);
      }
      .entry.fixed {
        border-left: 4px solid var(--primary-color);
      }
      .entry.superseded {
        opacity: 0.6;
      }
      .entry .t {
        flex: 1 1 120px;
        min-width: 90px;
        font-weight: 500;
        cursor: default;
      }
      input.dur {
        width: 62px;
        text-align: right;
      }
      .more {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed var(--divider-color);
      }
    `]}async patch(t){await this.api.op("entry_update",{entry_id:this.entry.id,fields:t})}async moveTo(){let t=this.entry,e=this.st.blocks.filter(n=>!n.past&&n.id!==t.block_id),i=await this.api.ui.form({title:`\u201E${this.ttl(t.task_id)}\u201C verschieben`,fields:[{key:"to",label:"Ziel",type:"select",options:[...e.map(n=>({value:n.id,label:`${n.date}${n.start_time?" "+n.start_time:""} (${h(n.fill_min)} / ${h(n.capacity_min)})`})),...t.block_id?[{value:"unscheduled",label:"Liste \u201Enicht eingeplant\u201C"}]:[]]}],values:{to:e[0]?.id??"unscheduled"},submitLabel:"Verschieben"});if(!i)return;let r=i.values.to;r==="unscheduled"?await this.api.op("entry_move",{entry_id:t.id,block_id:null,list:"unscheduled"}):await this.api.op("entry_move",{entry_id:t.id,block_id:r,index:null})}async removeEntry(){await this.api.op("entry_delete",{entry_id:this.entry.id})}render(){let t=this.entry,e=this.task(t.task_id);if(!e)return d;let i=this.canEdit&&!this.readonly&&!t.superseded,r=this.st.warnings.filter(p=>p.entry_id===t.id),n=this.blockById(t.block_id),l=!!n?.past,c=!e.ready&&e.reasons.length&&e.status!=="done"&&e.status!=="discarded";return a`<div class="entry ${t.fixed?"fixed":""} ${t.superseded?"superseded":""}">
      <div class="row">
        ${i&&n?a`<button
              class="icon"
              title=${t.fixed?"Fixierung l\xF6sen":"Fixieren (wird beim Nachr\xFCcken nie verschoben)"}
              @click=${()=>this.patch({fixed:!t.fixed})}
            >
              ${t.fixed?"\u{1F4CC}":"\u{1F4CD}"}
            </button>`:t.fixed?a`<span title="fixiert">📌</span>`:d}
        <span class="t" title=${e.title}>${e.title}</span>
        <input
          class="inline dur"
          .value=${`${Math.floor(t.planned_min/60)}:${String(t.planned_min%60).padStart(2,"0")}`}
          ?disabled=${!i}
          title="Geplante Dauer"
          @change=${p=>{let u=S(p.target.value);if(u===null||Number.isNaN(u)||u<=0){this.api.ui.toast("Ung\xFCltige Dauer",{kind:"error"}),p.target.value=h(t.planned_min);return}this.patch({planned_min:u})}}
        />
        ${l&&t.booked_min!==void 0?a`<span class="chip ${t.booked_min>=t.planned_min?"ok":""}" title="An diesem Tag gebucht">gebucht ${h(t.booked_min)}</span>`:d}
        ${!t.superseded&&!l&&this.canEdit?a`<button class="icon" title="Uhr starten" @click=${()=>this.startTimer(t.task_id)}>▶</button>`:d}
        <button class="icon" title="Mehr" @click=${()=>this.more=!this.more}>${this.more?"\u25B4":"\u22EF"}</button>
      </div>
      <div class="row" style="gap:4px;margin-top:2px">
        ${t.superseded?a`<span class="chip" title="Dieser Eintrag wurde nachgerückt">nachgerückt</span>`:d}
        ${t.fixed_time?a`<span class="chip">ab ${t.fixed_time}</span>`:d}
        ${t.with_whom?a`<span class="chip">mit ${t.with_whom}</span>`:d}
        <span class="chip small">${this.projectTitle(t.task_id)}</span>
        ${c?a`<span class="chip warn" title=${this.reasonText(e)}>🔒 ${this.reasonText(e)}</span>`:d}
        ${e.status==="done"?a`<span class="chip ok">erledigt</span>`:d}
      </div>
      ${r.map(p=>a`<div class="warning-box">
          ⚠ Voraussetzung „${p.prerequisite_title}“ ${we[p.reason]??""}${p.fixed?" (fixierter Termin)":""}.
        </div>`)}
      ${this.more?a`<div class="more">
            ${n&&!t.superseded?a`<div class="row">
                  <label class="small muted">Uhrzeit</label>
                  <input type="time" .value=${t.fixed_time??""} ?disabled=${!i||!t.fixed} @change=${p=>this.patch({fixed_time:p.target.value||null})} />
                  <label class="small muted">Mit wem</label>
                  <input .value=${t.with_whom??""} ?disabled=${!i} placeholder="z. B. Papa" @change=${p=>this.patch({with_whom:p.target.value})} />
                </div>
                ${!t.fixed&&i?a`<div class="muted small">Uhrzeit und „mit wem“ gelten für fixierte Einträge.</div>`:d}`:d}
            ${i?a`<div class="row" style="margin-top:6px">
                  <button @click=${()=>this.moveTo()}>${n?"In anderen Block \u2026":"Einplanen in \u2026"}</button>
                  <button class="danger" @click=${()=>this.removeEntry()}>Entfernen</button>
                </div>`:d}
          </div>`:d}
    </div>`}};m([y({attribute:!1})],q.prototype,"entry",2),m([y({type:Boolean})],q.prototype,"readonly",2),m([g()],q.prototype,"more",2);customElements.define("up-entry",q);var Mt="application/x-up-entry",st="application/x-up-block",N=class extends v{constructor(){super(...arguments);this.compact=!1;this.over=!1;this.overIdx=null}static{this.styles=[...v.styles,$`
      .block {
        border: 1px solid var(--divider-color);
        border-left: 5px solid var(--primary-color);
        border-radius: 10px;
        padding: 8px 10px;
        margin: 0 0 10px;
        background: var(--card-background-color, #fff);
      }
      .block.past {
        border-left-color: var(--secondary-text-color);
        background: var(--secondary-background-color);
      }
      .block.reserved {
        border-left-color: var(--warning-color, #ffa600);
      }
      .head {
        cursor: grab;
      }
      .gap {
        min-height: 6px;
      }
      .gap.over {
        background: var(--primary-color);
        opacity: 0.4;
        border-radius: 3px;
      }
    `]}async edit(){let t=this.block,e=await this.api.ui.form({title:"Block bearbeiten",fields:[{key:"date",label:"Datum",type:"date",required:!0},{key:"start_time",label:"Startzeit (optional)",type:"time"},{key:"cap",label:"Kapazit\xE4t",type:"duration",required:!0},{key:"note",label:"Notiz (z. B. Ort)",type:"text"},{key:"reserved_for",label:"Reserviert f\xFCr Projekt / Aufgabe",type:"task",allowEmpty:!0,hint:"In einen reservierten Block r\xFCckt beim Nachr\xFCcken nichts nach."}],values:{date:t.date,start_time:t.start_time,cap:t.capacity_min,note:t.note,reserved_for:t.reserved_for},actions:[{name:"delete",label:"Block l\xF6schen",danger:!0}],submitLabel:"Speichern"});if(e){if(e.action==="delete"){await this.api.ui.confirm("Block l\xF6schen","Die Eintr\xE4ge des Blocks wandern in die Liste \u201Enicht eingeplant\u201C.",!0,"L\xF6schen")&&await this.api.op("block_delete",{block_id:t.id});return}await this.api.op("block_update",{block_id:t.id,fields:{date:e.values.date,start_time:e.values.start_time,capacity_min:e.values.cap,note:e.values.note,reserved_for:e.values.reserved_for}})}}async addEntry(){let t=this.block,e=await this.api.ui.form({title:"Aufgabe einplanen",fields:[{key:"task",label:"Aufgabe",type:"task",required:!0,taskFilter:i=>{if(i.has_children||i.status==="done"||i.status==="discarded")return!1;if(!t.reserved_for)return!0;let r=i;for(;r;){if(r.id===t.reserved_for)return!0;r=this.task(r.parent_id)}return!1}},{key:"min",label:"Geplante Dauer (leer = Vorschlag)",type:"duration"}],submitLabel:"Einplanen"});e&&await this.api.op("entry_add",{task_id:e.values.task,block_id:t.id,planned_min:e.values.min})}async suggest(){let t=await this.api.ws("suggest_fill",{block_id:this.block.id});if(!t?.length)return this.api.ui.toast("Keine passenden bereiten Aufgaben gefunden.");await this.api.ui.confirm("Bef\xFCllung nach Priorit\xE4t",t.map(i=>`\u2022 ${i.title} \u2013 ${h(i.planned_min)}`).join(`
`),!1,"\xDCbernehmen")&&await this.api.op("entries_add_many",{block_id:this.block.id,items:t})}onDragOver(t,e){!t.dataTransfer?.types.includes(Mt)||this.block.past||(t.preventDefault(),t.stopPropagation(),this.over=!0,this.overIdx=e)}async onDrop(t,e){let i=t.dataTransfer?.getData(Mt);if(this.over=!1,this.overIdx=null,!i)return;t.preventDefault(),t.stopPropagation();let r=this.st.entries.find(l=>l.id===i),n=e;if(r&&r.block_id===this.block.id&&e!==null){let l=this.entriesOf(this.block.id).findIndex(c=>c.id===i);l!==-1&&l<e&&(n=e-1)}await this.api.op("entry_move",{entry_id:i,block_id:this.block.id,index:n})}render(){let t=this.block,e=this.entriesOf(t.id),i=Math.min(100,Math.round(t.fill_min/Math.max(1,t.capacity_min)*100));return a`<div
      class="block ${t.past?"past":""} ${t.reserved_for?"reserved":""} ${this.over?"drop-target":""}"
      @dragover=${r=>this.onDragOver(r,null)}
      @dragleave=${()=>(this.over=!1,this.overIdx=null)}
      @drop=${r=>this.onDrop(r,null)}
    >
      <div
        class="row head"
        draggable=${this.canEdit&&!t.past?"true":"false"}
        @dragstart=${r=>r.dataTransfer?.setData(st,t.id)}
      >
        <b>${t.date.split("-").reverse().slice(0,2).join(".")}.${t.start_time?` ab ${t.start_time}`:""}</b>
        ${t.closed?a`<span class="chip">abgeschlossen</span>`:t.past?a`<span class="chip">vergangen</span>`:d}
        ${t.reserved_for?a`<span class="chip warn">reserviert: ${this.ttl(t.reserved_for)}</span>`:d}
        ${t.note?a`<span class="muted small">${t.note}</span>`:d}
        <span class="right ${t.overbooked?"chip err":"muted small"}"
          >${x(t.fill_min)} / ${x(t.capacity_min)}${t.overbooked?" \u2013 \xFCberbucht":""}</span
        >
      </div>
      <div class="bar ${t.overbooked?"over":""}" style="margin:4px 0"><span style="width:${i}%"></span></div>
      ${e.map((r,n)=>a`<div class="gap ${this.over&&this.overIdx===n?"over":""}"
            @dragover=${l=>this.onDragOver(l,n)}
            @drop=${l=>this.onDrop(l,n)}></div>
          <up-entry
            .st=${this.st}
            .api=${this.api}
            .entry=${r}
            draggable=${this.canEdit&&!t.past&&!r.superseded?"true":"false"}
            @dragstart=${l=>l.dataTransfer?.setData(Mt,r.id)}
          ></up-entry>`)}
      ${e.length?d:a`<div class="muted small">Leer.</div>`}
      ${this.canEdit?a`<div class="row" style="margin-top:4px">
            ${t.past?d:a`<button @click=${()=>this.addEntry()}>+ Aufgabe</button>`}
            ${!t.past&&!this.compact?a`<button @click=${()=>this.suggest()}>Vorschlag</button>`:d}
            ${t.closed?d:a`<button @click=${()=>this.api.op("block_close",{block_id:t.id})}>Abschließen</button>`}
            <button class="right" @click=${()=>this.edit()}>Bearbeiten</button>
          </div>`:d}
    </div>`}};m([y({attribute:!1})],N.prototype,"block",2),m([y({type:Boolean})],N.prototype,"compact",2),m([g()],N.prototype,"over",2),m([g()],N.prototype,"overIdx",2);customElements.define("up-block",N);var Bt=["Mo","Di","Mi","Do","Fr","Sa","So"],Ee=["Januar","Februar","M\xE4rz","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"],j=class extends v{constructor(){super(...arguments);this.mode=localStorage.getItem("umbau_planer_cal_mode")||"list";this.anchor="";this.showPast=!1;this.dropDay=null}static{this.styles=[...v.styles,$`
      .week {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 8px;
      }
      .day {
        border: 1px solid var(--divider-color);
        border-radius: 10px;
        padding: 6px;
        min-height: 80px;
      }
      .day.today {
        border-color: var(--primary-color);
        border-width: 2px;
      }
      .month {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
        gap: 3px;
      }
      .cell {
        border: 1px solid var(--divider-color);
        border-radius: 6px;
        min-height: 70px;
        padding: 3px;
        font-size: 12px;
        overflow: hidden;
        cursor: pointer;
      }
      .cell.other {
        opacity: 0.5;
      }
      .cell.today {
        border-color: var(--primary-color);
        border-width: 2px;
      }
      .mb {
        display: block;
        margin-top: 2px;
        padding: 1px 4px;
        border-radius: 4px;
        background: color-mix(in srgb, var(--primary-color) 22%, transparent);
        font-size: 11px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: grab;
      }
      .mb.over {
        background: color-mix(in srgb, var(--error-color) 30%, transparent);
      }
      .mb.res {
        background: color-mix(in srgb, var(--warning-color, #ffa600) 35%, transparent);
      }
      .wd {
        text-align: center;
        font-size: 12px;
        color: var(--secondary-text-color);
      }
    `]}get cursor(){return this.anchor||this.st.today}setMode(t){this.mode=t;try{localStorage.setItem("umbau_planer_cal_mode",t)}catch{}}shift(t){let e=w(this.cursor);this.mode==="week"?e.setDate(e.getDate()+7*t):(e.setDate(1),e.setMonth(e.getMonth()+t)),this.anchor=tt(e)}async newBlock(t){let e=await this.api.ui.form({title:"Neuer Arbeitsblock",fields:[{key:"date",label:"Datum",type:"date",required:!0},{key:"start_time",label:"Startzeit (optional)",type:"time"},{key:"cap",label:"Kapazit\xE4t",type:"duration",required:!0},{key:"note",label:"Notiz (z. B. Ort)",type:"text"},{key:"reserved_for",label:"Reserviert f\xFCr (optional)",type:"task",allowEmpty:!0}],values:{date:t??this.st.today,cap:this.st.settings.default_capacity_min},submitLabel:"Anlegen"});if(!e)return;let i=e.values;await this.api.op("block_create",{date:i.date,start_time:i.start_time,capacity_min:i.cap,note:i.note,reserved_for:i.reserved_for})}async series(){let t=await this.api.ui.form({title:"Bl\xF6cke als Serie anlegen",fields:[{key:"start",label:"Ab Datum",type:"date",required:!0},{key:"weekdays",label:"Wochentage",type:"checks",options:Bt.map((r,n)=>({value:n,label:r}))},{key:"count",label:"Anzahl Bl\xF6cke",type:"number",hint:"oder Enddatum"},{key:"until",label:"Bis Datum",type:"date"},{key:"start_time",label:"Startzeit (optional)",type:"time"},{key:"cap",label:"Kapazit\xE4t",type:"duration"},{key:"note",label:"Notiz",type:"text"}],values:{start:this.st.today,weekdays:[5,6],count:4,cap:this.st.settings.default_capacity_min},submitLabel:"Serie anlegen"});if(!t)return;let e=t.values;if(!e.weekdays.length)return this.api.ui.toast("Bitte mindestens einen Wochentag w\xE4hlen.",{kind:"error"});let i=await this.api.op("block_series",{start_date:e.start,weekdays:e.weekdays,count:e.until?null:e.count,until:e.until,start_time:e.start_time,capacity_min:e.cap,note:e.note});i&&this.api.ui.toast(`${i.ids.length} Bl\xF6cke angelegt`)}blocksOn(t){return this.st.blocks.filter(e=>e.date===t)}onDayDragOver(t,e){t.dataTransfer?.types.includes(st)&&(t.preventDefault(),this.dropDay=e)}async onDayDrop(t,e){this.dropDay=null;let i=t.dataTransfer?.getData(st);if(!i)return;t.preventDefault();let r=this.blockById(i);!r||r.date===e||await this.api.op("block_update",{block_id:i,fields:{date:e}})}blockEl(t,e=!1){return a`<up-block .st=${this.st} .api=${this.api} .block=${t} .compact=${e}></up-block>`}listMode(){let t=this.st.today,e=new Map;for(let l of this.st.blocks){if(!this.showPast&&l.past)continue;let c=e.get(l.date)??[];c.push(l),e.set(l.date,c)}let i=[...e.keys()].sort(),r=this.listEntries("reschedule"),n=this.listEntries("unscheduled");return a`
      ${r.length?a`<div class="card">
            <h3 style="margin-top:0">Neu terminieren</h3>
            <div class="muted small">Fixierte Einträge, die nicht fertig wurden. Von Hand neu einplanen.</div>
            ${r.map(l=>a`<up-entry .st=${this.st} .api=${this.api} .entry=${l} draggable=${this.canEdit} @dragstart=${c=>c.dataTransfer?.setData("application/x-up-entry",l.id)}></up-entry>`)}
          </div>`:d}
      ${n.length?a`<div class="card">
            <h3 style="margin-top:0">Nicht eingeplant</h3>
            <div class="muted small">Passt in keinen angelegten Block. Lege Blöcke an und rücke nach.</div>
            ${n.map(l=>a`<up-entry .st=${this.st} .api=${this.api} .entry=${l} draggable=${this.canEdit} @dragstart=${c=>c.dataTransfer?.setData("application/x-up-entry",l.id)}></up-entry>`)}
          </div>`:d}
      <label class="row" style="margin-bottom:6px"
        ><input type="checkbox" .checked=${this.showPast} @change=${l=>this.showPast=l.target.checked} />Vergangene Blöcke zeigen</label
      >
      ${i.length?i.map(l=>a`<h3>${gt(l,t)}</h3>
              ${e.get(l).map(c=>this.blockEl(c))}`):a`<div class="card empty">Keine Blöcke. Lege einen Block oder eine Serie an.</div>`}
    `}weekMode(){let t=et(this.cursor),e=Array.from({length:7},(r,n)=>D(t,n)),i=w(e[0]);return a`
      <h3 style="margin-top:0">Woche ab ${i.getDate()}.${i.getMonth()+1}.${i.getFullYear()}</h3>
      <div class="week">
        ${e.map((r,n)=>a`<div
            class="day ${r===this.st.today?"today":""} ${this.dropDay===r?"drop-target":""}"
            @dragover=${l=>this.onDayDragOver(l,r)}
            @dragleave=${()=>this.dropDay=null}
            @drop=${l=>this.onDayDrop(l,r)}
          >
            <div class="row"><b>${Bt[n]} ${w(r).getDate()}.${w(r).getMonth()+1}.</b>
              ${this.canEdit?a`<button class="icon right" title="Block anlegen" @click=${()=>this.newBlock(r)}>+</button>`:d}
            </div>
            ${this.blocksOn(r).map(l=>this.blockEl(l,!0))}
          </div>`)}
      </div>
    `}monthMode(){let t=w(this.cursor),e=new Date(t.getFullYear(),t.getMonth(),1),i=et(tt(e)),r=Array.from({length:42},(n,l)=>D(i,l));return a`
      <h3 style="margin-top:0">${Ee[e.getMonth()]} ${e.getFullYear()}</h3>
      <div class="month">
        ${Bt.map(n=>a`<div class="wd">${n}</div>`)}
        ${r.map(n=>{let l=w(n);return a`<div
            class="cell ${l.getMonth()!==e.getMonth()?"other":""} ${n===this.st.today?"today":""} ${this.dropDay===n?"drop-target":""}"
            @click=${()=>{this.anchor=n,this.setMode("week")}}
            @dragover=${c=>this.onDayDragOver(c,n)}
            @dragleave=${()=>this.dropDay=null}
            @drop=${c=>this.onDayDrop(c,n)}
          >
            ${l.getDate()}
            ${this.blocksOn(n).map(c=>a`<span
                class="mb ${c.overbooked?"over":""} ${c.reserved_for?"res":""}"
                draggable=${this.canEdit&&!c.past?"true":"false"}
                title="${c.note} ${x(c.fill_min)} von ${x(c.capacity_min)}"
                @dragstart=${p=>p.dataTransfer?.setData(st,c.id)}
                >${c.start_time??""} ${x(c.fill_min)}/${x(c.capacity_min)}</span
              >`)}
          </div>`})}
      </div>
    `}render(){return a`
      <div class="row" style="margin-bottom:8px">
        <h2 style="margin:0">Kalender</h2>
        ${["list","week","month"].map(t=>a`<button class=${this.mode===t?"primary":""} @click=${()=>this.setMode(t)}>
            ${t==="list"?"Liste":t==="week"?"Woche":"Monat"}
          </button>`)}
        ${this.mode!=="list"?a`<button @click=${()=>this.shift(-1)}>‹</button>
              <button @click=${()=>this.anchor=""}>Heute</button>
              <button @click=${()=>this.shift(1)}>›</button>`:d}
        <span class="right"></span>
        ${this.canEdit?a`<button @click=${()=>this.newBlock()}>+ Block</button><button @click=${()=>this.series()}>Serie …</button>`:d}
      </div>
      ${this.mode==="list"?this.listMode():this.mode==="week"?this.weekMode():this.monthMode()}
    `}};m([g()],j.prototype,"mode",2),m([g()],j.prototype,"anchor",2),m([g()],j.prototype,"showPast",2),m([g()],j.prototype,"dropDay",2);customElements.define("up-view-calendar",j);var L=(o,s=2)=>o==null?"\u2013":o.toFixed(s).replace(".",",");function Se(o){if(o===null)return"\u2013";let s=Math.round((o-1)*100);return`\xD7${L(o)} (${s>=0?"+":"\u2212"}${Math.abs(s)} %)`}var ft=class extends v{constructor(){super(...arguments);this.ev=null;this.lastRev=-1}static{this.styles=[...v.styles,$`
      svg {
        width: 100%;
        height: 160px;
        background: var(--secondary-background-color);
        border-radius: 8px;
      }
    `]}willUpdate(){this.st&&this.st.rev!==this.lastRev&&(this.lastRev=this.st.rev,this.api.ws("evaluation").then(t=>t&&(this.ev=t)))}statRow(t,e){return a`<tr>
      <td>${t}</td>
      <td class="num">${Se(e.median)}</td>
      <td class="num">${e.count}</td>
      <td class="num">${e.stdev===null?"\u2013":`\xB1 ${L(e.stdev)}`}</td>
      <td class="num">${e.min===null?"\u2013":`${L(e.min)} \u2013 ${L(e.max)}`}</td>
    </tr>`}chart(t){let e=t.trend;if(e.length<2)return a`<div class="muted">Für den Verlauf werden mindestens zwei erledigte, geschätzte Aufgaben benötigt.</div>`;let i=600,r=150,n=Math.max(2,...e.map(u=>u.factor))*1.05,l=u=>20+u*(i-40)/(e.length-1),c=u=>r-15-u/n*(r-30),p=u=>e.map((f,b)=>`${l(b)},${c(f[u])}`).join(" ");return a`<svg viewBox="0 0 ${i} ${r}" preserveAspectRatio="none" role="img" aria-label="Verlauf des Schätzfaktors">
      <line x1="20" x2=${i-20} y1=${c(1)} y2=${c(1)} stroke="currentColor" stroke-dasharray="4" opacity="0.4" />
      <text x="22" y=${c(1)-3} font-size="10" fill="currentColor" opacity="0.7">×1,0 (genau geschätzt)</text>
      <polyline points=${p("factor")} fill="none" stroke="var(--secondary-text-color)" stroke-width="1.5" />
      ${e.map((u,f)=>a`<circle cx=${l(f)} cy=${c(u.factor)} r="3" fill="var(--secondary-text-color)"><title>${u.title}: ×${L(u.factor)}</title></circle>`)}
      <polyline points=${p("rolling_median")} fill="none" stroke="var(--primary-color)" stroke-width="2.5" />
    </svg>
    <div class="muted small">Grau: Faktor je Aufgabe. Blau: gleitender Median über 5 Aufgaben. Sinkt die blaue Linie Richtung ×1,0, werden die Schätzungen besser.</div>`}render(){let t=this.ev,e=this.st.tasks.filter(i=>i.parent_id===null&&i.status!=="discarded");return a`
      <h2>Auswertung</h2>
      <div class="card">
        <h3 style="margin-top:0">Soll-Ist je Projekt</h3>
        <div class="scroll-x"><table>
          <tr><th>Projekt</th><th class="num">Geschätzt</th><th class="num">Gebucht</th><th class="num">davon eigene</th><th class="num">Rest</th><th class="num">Prognose</th><th class="num">Abweichung</th></tr>
          ${e.map(i=>a`<tr>
              <td>${i.title}</td>
              <td class="num">${i.summary.estimate_min===null?"\u2013":h(i.summary.estimate_min)}${i.summary.rough_min!==null?a`<div class="muted small">Grob ${h(i.summary.rough_min)}</div>`:d}</td>
              <td class="num">${h(i.summary.booked_min)}</td>
              <td class="num">${h(i.summary.booked_own_min)}</td>
              <td class="num">${h(i.summary.remaining_min)}</td>
              <td class="num">${h(i.summary.forecast_min)}</td>
              <td class="num" style="color:${(i.summary.deviation_min??0)>0?"var(--error-color)":"inherit"}">${Q(i.summary.deviation_min)}</td>
            </tr>`)}
        </table></div>
        <div class="muted small">Aufgaben ohne Schätzung fließen nicht in den Vergleich ein. Aufwand = eigene Zeit + Helferstunden.</div>
      </div>
      ${t?a`
            <div class="card">
              <h3 style="margin-top:0">Schätzfaktor (Aufwand ÷ ursprüngliche Schätzung)</h3>
              <div class="scroll-x"><table>
                <tr><th></th><th class="num">Median</th><th class="num">Aufgaben</th><th class="num">Streuung</th><th class="num">Spanne</th></tr>
                ${this.statRow("Insgesamt",t.overall)}
                ${Object.entries(t.by_category).map(([i,r])=>this.statRow(`Gewerk: ${i}`,r))}
                ${Object.entries(t.by_project).map(([,i])=>this.statRow(`Projekt: ${i.title}`,i))}
              </table></div>
              <div class="muted small">Faktor 1,6 bedeutet: 60 Prozent länger als geschätzt.</div>
            </div>
            <div class="card"><h3 style="margin-top:0">Verlauf</h3>${this.chart(t)}</div>
            <div class="card">
              <h3 style="margin-top:0">Hochrechnung der Restarbeit</h3>
              <div class="scroll-x"><table>
                <tr><th>Projekt</th><th class="num">Rest laut Schätzung</th><th class="num">Hochgerechnet</th><th class="num">in Blöcken</th></tr>
                ${t.projects.map(i=>a`<tr><td>${i.title}</td><td class="num">${h(i.remaining_min)}<div class="muted small">${L(i.remaining_blocks,1)} Blöcke</div></td><td class="num"><b>${h(i.forecast_min)}</b></td><td class="num"><b>${L(i.forecast_blocks,1)}</b></td></tr>`)}
              </table></div>
              <div class="muted small">Rest × Median-Faktor des Gewerks (bei weniger als 5 erledigten Aufgaben im Gewerk: Gesamtfaktor). Block = ${h(this.st.settings.default_capacity_min)}.</div>
            </div>
            <div class="card">
              <h3 style="margin-top:0">Geplant gegen gebucht je Block</h3>
              ${t.blocks.length?a`<div class="scroll-x"><table>
                    <tr><th>Block</th><th class="num">Geplant</th><th class="num">Gebucht</th><th class="num">Nachgerückt</th></tr>
                    ${t.blocks.map(i=>a`<tr><td>${i.date}${i.closed?" \u2713":""}</td><td class="num">${h(i.planned_min)}</td><td class="num">${h(i.booked_min)}</td><td class="num">${i.rolled_over}</td></tr>`)}
                  </table></div>`:a`<div class="muted">Noch keine Blöcke mit Einträgen.</div>`}
            </div>
            <div class="card">
              <h3 style="margin-top:0">Ohne Schätzung (nicht in der Auswertung)</h3>
              ${t.unestimated.length?t.unestimated.map(i=>a`<div>${i.title} <span class="muted small">${this.ttl(i.project_id)}${i.state==="done"?" \xB7 erledigt":""}</span></div>`):a`<div class="muted">Alle Aufgaben sind geschätzt.</div>`}
            </div>
          `:a`<div class="card empty">Lade Auswertung …</div>`}
    `}};m([g()],ft.prototype,"ev",2);customElements.define("up-view-evaluation",ft);var F=class extends v{constructor(){super(...arguments);this.compact=!1;this.picking=!1}static{this.styles=[...v.styles,$`
      :host {
        display: inline-block;
      }
      .picker {
        display: flex;
        gap: 3px;
        margin-top: 4px;
        flex-wrap: wrap;
      }
      .picker button {
        min-width: 30px;
        padding: 2px 6px;
        min-height: 28px;
      }
      .picker button.sel {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
      }
      button.chipbtn {
        padding: 0 8px;
        min-height: 24px;
        border-radius: 999px;
        font-size: 12px;
      }
    `]}async set(t){this.picking=!1,await this.api.op("priority_set",{task_id:this.item.id,level:t})}render(){let t=this.item,e=this.st.me.person_id,i=this.levels;return a`
      <span class="row" style="gap:4px">
        ${this.persons.map(r=>{let n=t.priority.persons[r.id],l=r.id===e,c=n?.level?`${r.name.slice(0,1)} ${n.level}`:`${r.name.slice(0,1)} \u2013`,p=`${r.name}: ${n?.level?`${n.level} ${i[n.level-1]??""}`:"nicht bewertet"}${n?.inherited?" (geerbt)":""}${l?" \u2013 antippen zum \xC4ndern":""}`;return l?a`<button
                class="chip chipbtn ${n?.inherited?"inherited":""}"
                title=${p}
                @click=${()=>this.picking=!this.picking}
              >
                ${c}
              </button>`:a`<span class="chip ${n?.inherited?"inherited":""}" title=${p}>${c}</span>`})}
        ${t.priority.unrated?a`<span class="chip warn" title="Von niemandem bewertet">unbewertet</span>`:a`<span
              class="chip ${t.priority.disagree?"err":"ok"}"
              title="Gemeinsame Priorität${t.priority.disagree?" \u2013 uneinig":""}"
              >Ø ${String(t.priority.combined_level).replace(".",",")}${t.priority.disagree?" \u2260":""}</span
            >`}
      </span>
      ${this.picking?a`<div class="picker">
            ${i.map((r,n)=>a`<button
                class=${t.priorities[e??""]===n+1?"sel":""}
                title=${r}
                @click=${()=>this.set(n+1)}
              >
                ${n+1}
              </button>`)}
            <button title="Bewertung entfernen" @click=${()=>this.set(null)}>–</button>
          </div>`:d}
    `}};m([y({attribute:!1})],F.prototype,"item",2),m([y({type:Boolean})],F.prototype,"compact",2),m([g()],F.prototype,"picking",2);customElements.define("up-prio-chips",F);var vt=class extends v{ids(){return[]}heading(){return""}emptyText(){return""}async plan(s){let t=this.task(s),e=this.st.blocks.filter(r=>!r.past);if(!e.length){this.api.ui.toast("Es gibt keinen offenen Arbeitsblock.",{kind:"warn"});return}let i=await this.api.ui.form({title:`\u201E${t.title}\u201C einplanen`,fields:[{key:"block",label:"Arbeitsblock",type:"select",options:e.map(r=>({value:r.id,label:`${r.date}${r.start_time?" "+r.start_time:""} (${h(r.fill_min)} / ${h(r.capacity_min)})`}))},{key:"min",label:"Geplante Dauer",type:"duration",required:!0}],values:{block:e[0].id,min:Math.max(30,t.summary.remaining_min-t.planned_min)},submitLabel:"Einplanen"});i&&await this.api.op("entry_add",{task_id:s,block_id:i.values.block,planned_min:i.values.min})}render(){let s=this.ids();return a`<h2>${this.heading()}</h2>
      ${s.length?s.map(t=>{let e=this.task(t);return a`<div class="card">
              <div class="row">
                <b class="grow">${e.title}</b>
                ${this.canEdit?a`<button @click=${()=>this.startTimer(t)}>▶ Start</button>`:d}
                ${this.canEdit&&!e.has_children?a`<button @click=${()=>this.plan(t)}>Einplanen</button>`:d}
              </div>
              <div class="muted small">${this.projectTitle(t)}${e.category?` \xB7 ${e.category}`:""}</div>
              <div class="row" style="margin-top:4px">
                <up-prio-chips .st=${this.st} .api=${this.api} .item=${e}></up-prio-chips>
                <span class="chip">Rest ${h(e.summary.remaining_min)}</span>
                ${e.summary.unestimated?a`<span class="chip">ohne Schätzung</span>`:a`<span class="chip">geschätzt ${h(e.summary.estimate_min)}</span>`}
                ${e.planned_min?a`<span class="chip">eingeplant ${h(e.planned_min)}</span>`:d}
                ${e.priority.disagree?a`<span class="chip err">Abstand ${e.priority.distance}</span>`:d}
              </div>
              ${e.notes?a`<div class="muted small" style="margin-top:4px">${e.notes}</div>`:d}
            </div>`}):a`<div class="card empty">${this.emptyText()}</div>`}`}},Ot=class extends vt{ids(){return this.st.ready_ids}heading(){return"Jetzt m\xF6glich"}emptyText(){return"Keine Aufgabe ist gerade bereit."}};customElements.define("up-view-ready",Ot);var Rt=class extends vt{ids(){return this.st.disagree_ids}heading(){return"Uneinig"}emptyText(){return"Ihr seid euch bei allen bewerteten Aufgaben einig."}};customElements.define("up-view-disagree",Rt);function ie(o){return`${Math.floor(o/60)}:${String(o%60).padStart(2,"0")}`}var rt=class extends v{constructor(){super(...arguments);this.haUsers=[];this.levelDraft=null}connectedCallback(){super.connectedCallback(),this.api.hass.callWS({type:"config/auth/list"}).then(t=>this.haUsers=t.filter(e=>!e.system_generated)).catch(()=>{})}async save(t){await this.api.op("settings_update",{fields:t})}savePersons(t){return this.save({persons:t})}personRow(t){let e=this.persons,i=n=>this.savePersons(e.map(l=>l.id===t.id?{...l,...n}:l)),r=this.api.hass.user;return a`<div class="card">
      <div class="row">
        <input class="grow" .value=${t.name} placeholder="Name" @change=${n=>i({name:n.target.value})} />
        <select @change=${n=>i({role:n.target.value})}>
          <option value="executor" ?selected=${t.role==="executor"}>Ausführende Person</option>
          <option value="rater" ?selected=${t.role==="rater"}>Bewertende Person</option>
        </select>
      </div>
      <div class="row" style="margin-top:6px">
        <span class="muted small">Home-Assistant-Benutzer:</span>
        ${this.haUsers.length?a`<select @change=${n=>i({ha_user_id:n.target.value||null})}>
              <option value="">– nicht zugeordnet –</option>
              ${this.haUsers.map(n=>a`<option value=${n.id} ?selected=${n.id===t.ha_user_id}>${n.name}</option>`)}
            </select>`:a`<span>${t.ha_user_id?"zugeordnet":"nicht zugeordnet"}</span>`}
        ${r&&t.ha_user_id!==r.id?a`<button @click=${()=>i({ha_user_id:r.id})}>Mir (${r.name}) zuordnen</button>`:d}
        <button class="danger right" @click=${()=>this.removePerson(t)}>Entfernen</button>
      </div>
    </div>`}async removePerson(t){await this.api.ui.confirm("Person entfernen",`Die Wertungen von \u201E${t.name}\u201C gehen verloren.`,!0,"Entfernen")&&await this.savePersons(this.persons.filter(i=>i.id!==t.id))}async addPerson(){let t=await this.api.ui.form({title:"Person hinzuf\xFCgen",fields:[{key:"name",label:"Name",type:"text",required:!0},{key:"role",label:"Rolle",type:"select",options:[{value:"executor",label:"Ausf\xFChrende Person"},{value:"rater",label:"Bewertende Person"}]}],values:{role:this.persons.length?"rater":"executor"},submitLabel:"Hinzuf\xFCgen"});if(!t)return;let e=this.api.hass.user,i=this.persons.length===0;await this.savePersons([...this.persons,{id:ee(),name:t.values.name,role:t.values.role,ha_user_id:i&&e?e.id:null}])}async applyLevels(){let t=(this.levelDraft??this.levels).map(e=>e.trim()).filter(Boolean);if(t.length<2)return this.api.ui.toast("Mindestens zwei Stufen.",{kind:"error"});if(t.length!==this.levels.length){let e=await this.api.ws("rescale_preview",{level_names:t});if(e===void 0||!await this.api.ui.confirm("Priorit\xE4tsstufen \xE4ndern",`Von ${this.levels.length} auf ${t.length} Stufen.
${e.length} bestehende Wertung${e.length===1?"":"en"} werden proportional umgerechnet.`,!1,"Umrechnen"))return}await this.save({level_names:t}),this.levelDraft=null}async doExport(){let t=await this.api.ws("export");if(!t)return;let e=new Blob([JSON.stringify(t,null,1)],{type:"application/json"}),i=document.createElement("a");i.href=URL.createObjectURL(e),i.download=`umbau-planer-${this.st.today}.json`,i.click(),URL.revokeObjectURL(i.href)}async doImport(t){let e=t.target,i=e.files?.[0];if(e.value="",!i)return;let r;try{r=JSON.parse(await i.text())}catch{return this.api.ui.toast("Die Datei ist kein g\xFCltiges JSON.",{kind:"error"})}await this.api.ui.confirm("Daten importieren",`Alle aktuellen Daten werden durch den Inhalt von \u201E${i.name}\u201C ersetzt. Vorher wird automatisch eine Sicherung angelegt.`,!0,"Importieren")&&await this.api.ws("import",{data:r})&&this.api.ui.toast("Import abgeschlossen")}async addCategory(){let t=await this.api.ui.form({title:"Gewerk hinzuf\xFCgen",fields:[{key:"name",label:"Name",type:"text",required:!0}],submitLabel:"Hinzuf\xFCgen"});t&&await this.save({categories:[...this.st.settings.categories,t.values.name]})}durField(t,e,i,r){return a`<div>
      <label class="small muted">${t}</label><br />
      <input
        style="width:110px"
        .value=${ie(i)}
        @change=${n=>{let l=S(n.target.value);if(l===null||Number.isNaN(l)||l<=0)return n.target.value=ie(i),this.api.ui.toast("Ung\xFCltige Dauer",{kind:"error"});this.save({[e]:l})}}
      />
      ${r?a`<div class="muted small">${r}</div>`:d}
    </div>`}render(){let t=this.st.settings,e=this.levelDraft??t.level_names;return a`
      <h2>Einstellungen</h2>
      ${this.canEdit?d:a`<div class="warning-box">Du kannst die Einstellungen ansehen, aber nicht ändern.</div>`}
      <h3>Personen</h3>
      <div class="muted small" style="margin-bottom:6px">
        Jede Person ist einem Home-Assistant-Benutzer zugeordnet. Die Zuordnung bestimmt, wessen Priorität du änderst.
        Ausführende Personen planen und stempeln, bewertende Personen vergeben nur ihre Prioritäten.
      </div>
      ${this.persons.map(i=>this.personRow(i))}
      ${this.canEdit?a`<button @click=${()=>this.addPerson()}>+ Person</button>`:d}

      <h3>Prioritätsstufen</h3>
      <div class="card">
        <div class="muted small">Stufe 1 ist die höchste Priorität.</div>
        ${e.map((i,r)=>a`<div class="row" style="margin:4px 0">
            <b style="width:20px">${r+1}</b>
            <input class="grow" .value=${i} ?disabled=${!this.canEdit} @input=${n=>{let l=[...e];l[r]=n.target.value,this.levelDraft=l}} />
            <button class="icon" ?disabled=${!this.canEdit||e.length<=2} title="Stufe entfernen" @click=${()=>this.levelDraft=e.filter((n,l)=>l!==r)}>✕</button>
          </div>`)}
        ${this.canEdit?a`<div class="row">
              <button @click=${()=>this.levelDraft=[...e,`Stufe ${e.length+1}`]}>+ Stufe</button>
              ${this.levelDraft?a`<button class="primary" @click=${()=>this.applyLevels()}>Übernehmen</button><button @click=${()=>this.levelDraft=null}>Verwerfen</button>`:d}
            </div>`:d}
      </div>

      <h3>Gewerke</h3>
      <div class="card">
        <div class="row">
          ${t.categories.map(i=>a`<span class="chip">${i}${this.canEdit?a` <a style="cursor:pointer" title="Entfernen" @click=${()=>this.save({categories:t.categories.filter(r=>r!==i)})}>✕</a>`:d}</span>`)}
          ${this.canEdit?a`<button @click=${()=>this.addCategory()}>+ Gewerk</button>`:d}
        </div>
      </div>

      <h3>Schwellen und Standardwerte</h3>
      <div class="card row" style="gap:16px;align-items:flex-start">
        ${this.durField("Standardkapazit\xE4t eines Blocks","default_capacity_min",t.default_capacity_min)}
        ${this.durField("Kleinste Teilgr\xF6\xDFe beim Nachr\xFCcken","min_split_min",t.min_split_min)}
        ${this.durField("Lange laufende Uhr ab","long_timer_min",t.long_timer_min,"oder \xFCber Mitternacht")}
        <div>
          <label class="small muted">„Uneinig“ ab Abstand</label><br />
          <input type="number" min="1" style="width:80px" .value=${String(t.disagree_threshold)} ?disabled=${!this.canEdit} @change=${i=>this.save({disagree_threshold:Number(i.target.value)})} />
          <div class="muted small">Stufen</div>
        </div>
      </div>

      <h3>Datensicherung</h3>
      <div class="card">
        <div class="row">
          <button @click=${()=>this.doExport()}>Export als JSON</button>
          ${this.canEdit?a`<label class="btn" style="cursor:pointer">Import …<input type="file" accept="application/json,.json" hidden @change=${i=>this.doImport(i)} /></label>`:d}
        </div>
        <div class="muted small" style="margin-top:6px">
          Vor jedem Import und jeder Migration legt der Umbau-Planer automatisch eine Sicherung im Ordner
          <code>umbau_planer_backups</code> des Konfigurationsverzeichnisses ab. Standardkapazität aktuell ${h(t.default_capacity_min)}.
        </div>
      </div>
    `}};m([g()],rt.prototype,"haUsers",2),m([g()],rt.prototype,"levelDraft",2);customElements.define("up-view-settings",rt);var nt={open:"offen",in_progress:"in Arbeit",done:"erledigt",discarded:"verworfen"},se="umbau_planer_tasks_ui";function Ae(){let o={folded:[],search:"",status:"",category:"",project:"",readyOnly:!1,hideDone:!1};try{return{...o,...JSON.parse(localStorage.getItem(se)??"{}")}}catch{return o}}function Nt(o){return o===null?"":`${Math.floor(o/60)}:${String(o%60).padStart(2,"0")}`}var C=class extends v{constructor(){super(...arguments);this.ui=Ae();this.open=null;this.highlight=null;this.drop=null;this.dragId=null}static{this.styles=[...v.styles,$`
      .toolbar {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 8px;
        align-items: center;
      }
      .toolbar input[type="search"] {
        flex: 1 1 160px;
      }
      .task {
        border-bottom: 1px solid var(--divider-color);
        padding: 4px 0;
      }
      .task.hl {
        background: color-mix(in srgb, var(--primary-color) 15%, transparent);
      }
      .task.done .title,
      .task.discarded .title {
        text-decoration: line-through;
        opacity: 0.6;
      }
      .task.drop-before {
        box-shadow: 0 -2px 0 var(--primary-color);
      }
      .task.drop-after {
        box-shadow: 0 2px 0 var(--primary-color);
      }
      .task.drop-into {
        outline: 2px dashed var(--primary-color);
      }
      .handle {
        cursor: grab;
        user-select: none;
        color: var(--secondary-text-color);
        padding: 0 2px;
      }
      .fold {
        width: 26px;
        padding: 0;
        min-width: 26px;
        border: none;
        background: none;
      }
      .title {
        flex: 1 1 140px;
        min-width: 100px;
        font-weight: 500;
      }
      .nums {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
        font-size: 12px;
        color: var(--secondary-text-color);
        margin: 2px 0 0 62px;
      }
      .nums input {
        width: 64px;
        text-align: right;
      }
      .reason {
        font-size: 12px;
        color: var(--warning-color, #b26a00);
        margin: 0 0 0 62px;
      }
      .reason a {
        color: inherit;
        text-decoration: underline;
        cursor: pointer;
      }
      .details {
        margin: 6px 0 6px 40px;
        padding: 8px 10px;
        border-left: 3px solid var(--primary-color);
        background: var(--secondary-background-color);
        border-radius: 0 8px 8px 0;
      }
      .details label {
        display: block;
        font-size: 12px;
        color: var(--secondary-text-color);
        margin: 6px 0 2px;
      }
      .sumtable td {
        padding: 2px 8px 2px 0;
        border: none;
      }
      select.status {
        min-height: 28px;
        padding: 2px 4px;
        font-size: 12px;
      }
      @media (max-width: 600px) {
        .nums,
        .reason {
          margin-left: 6px;
        }
        .nums {
          gap: 4px 10px;
        }
        .details {
          margin-left: 6px;
        }
        .chips {
          margin-left: 6px !important;
        }
      }
    `]}save(t){this.ui={...this.ui,...t};try{localStorage.setItem(se,JSON.stringify(this.ui))}catch{}}filtering(){let t=this.ui;return!!(t.search||t.status||t.category||t.project||t.readyOnly)}visible(){let t=this.ui,e=this.st.tasks,i=t.search.trim().toLowerCase(),r=p=>!(i&&!(p.title.toLowerCase().includes(i)||p.notes.toLowerCase().includes(i))||t.status&&p.status!==t.status||t.category&&(p.category??"")!==t.category||t.project&&p.project_id!==t.project||t.readyOnly&&!(p.ready&&!p.has_children)),n;if(this.filtering()){n=new Set;for(let p of e)if(r(p)){let u=p;for(;u&&!n.has(u.id);)n.add(u.id),u=this.task(u.parent_id)}}else n=new Set(e.map(p=>p.id));let l=new Set(t.folded),c=this.filtering();return e.filter(p=>{if(!n.has(p.id)||t.hideDone&&(p.status==="done"||p.status==="discarded"))return!1;if(c)return!0;let u=this.task(p.parent_id);for(;u;){if(l.has(u.id))return!1;u=this.task(u.parent_id)}return!0})}toggleFold(t){let e=new Set(this.ui.folded);e.has(t)?e.delete(t):e.add(t),this.save({folded:[...e]})}jumpTo(t){let e=new Set(this.ui.folded),i=this.task(this.task(t)?.parent_id);for(;i;)e.delete(i.id),i=this.task(i.parent_id);this.save({folded:[...e],search:"",status:"",category:"",project:"",readyOnly:!1}),this.highlight=t,this.updateComplete.then(()=>{this.renderRoot.querySelector(`[data-id="${t}"]`)?.scrollIntoView({block:"center",behavior:"smooth"})}),setTimeout(()=>this.highlight=null,2500)}async patchTask(t,e){await this.api.op("task_update",{task_id:t.id,fields:e})}async editDur(t,e,i){let r=i.target,n=S(r.value);if(n!==null&&Number.isNaN(n)){this.api.ui.toast("Ung\xFCltige Dauer, z. B. 1:30 oder 90 min",{kind:"error"}),r.value=Nt(e==="estimate_initial_min"?t.estimate_initial_min:t.remaining_min);return}await this.patchTask(t,{[e]:n})}async addTask(t){let e=await this.api.ui.form({title:t?`Unteraufgabe zu \u201E${t.title}\u201C`:"Neues Projekt",fields:[{key:"title",label:"Titel",type:"text",required:!0},{key:"estimate",label:"Sch\xE4tzung",type:"duration"},{key:"category",label:"Gewerk",type:"select",allowEmpty:!0,options:this.st.settings.categories.map(n=>({value:n,label:n}))}],submitLabel:"Anlegen"});if(!e)return;let i=e.values;await this.api.op("task_create",{title:i.title,parent_id:t?.id??null,estimate_initial_min:i.estimate,category:i.category})&&t&&this.save({folded:this.ui.folded.filter(n=>n!==t.id)})}async quickAdd(t){if(t.key!=="Enter")return;let e=t.target,i=e.value.trim();i&&(e.value="",await this.api.op("task_create",{title:i,parent_id:null}))}async removeTask(t){let e=await this.api.ws("delete_info",{task_id:t.id});if(!e)return;let i=[`\u201E${t.title}\u201C l\xF6schen?`];if(e.descendants&&i.push(`Betroffen sind ${e.descendants} Unteraufgabe${e.descendants===1?"":"n"}.`),e.with_bookings&&i.push(`${e.with_bookings} Aufgabe${e.with_bookings===1?" hat":"n haben"} Zeitbuchungen und werden nicht gel\xF6scht, sondern auf \u201Everworfen\u201C gesetzt.`),!await this.api.ui.confirm("Aufgabe l\xF6schen",i.join(`
`),!0,"L\xF6schen"))return;let n=await this.api.op("task_delete",{task_id:t.id});n&&n.discarded&&this.api.ui.toast(`${n.deleted} gel\xF6scht, ${n.discarded} verworfen`)}async move(t){let e=new Set([t.id]);for(let r of this.st.tasks){let n=this.task(r.parent_id);for(;n;)n.id===t.id&&e.add(r.id),n=this.task(n.parent_id)}let i=await this.api.ui.form({title:`\u201E${t.title}\u201C verschieben`,fields:[{key:"parent",label:"Unter Aufgabe (leer = als Projekt)",type:"task",allowEmpty:!0,taskFilter:r=>!e.has(r.id)},{key:"pos",label:"Position",type:"select",options:[{value:"end",label:"Am Ende"},{value:"start",label:"Am Anfang"}]}],values:{parent:t.parent_id??"",pos:"end"},submitLabel:"Verschieben"});i&&await this.api.op("task_move",{task_id:t.id,parent_id:i.values.parent,index:i.values.pos==="start"?0:null})}async plan(t){let e=this.st.blocks.filter(n=>!n.past);if(!e.length){this.api.ui.toast("Es gibt keinen offenen Arbeitsblock. Lege im Kalender einen an.",{kind:"warn"});return}let i=Math.max(0,t.summary.remaining_min-t.planned_min),r=await this.api.ui.form({title:`\u201E${t.title}\u201C einplanen`,message:t.ready?void 0:`Hinweis: ${this.reasonText(t)}`,fields:[{key:"block",label:"Arbeitsblock",type:"select",options:e.map(n=>({value:n.id,label:`${n.date}${n.start_time?" "+n.start_time:""} (${h(n.fill_min)} / ${h(n.capacity_min)})${n.note?" \u2013 "+n.note:""}`}))},{key:"min",label:"Geplante Dauer",type:"duration",required:!0}],values:{block:e[0].id,min:i||30},submitLabel:"Einplanen"});r&&await this.api.op("entry_add",{task_id:t.id,block_id:r.values.block,planned_min:r.values.min})}async addBlocker(t){let e=await this.api.ui.form({title:"Blockiert durch \u2026",message:"Die gew\xE4hlte Aufgabe muss erledigt sein, bevor diese bereit ist.",fields:[{key:"other",label:"Aufgabe",type:"task",required:!0,taskFilter:i=>i.id!==t.id}],submitLabel:"Hinzuf\xFCgen"});e&&await this.patchTask(t,{blocked_by:[...t.blocked_by,e.values.other]})}onDragOver(t,e){if(!this.dragId||this.dragId===e.id)return;t.preventDefault();let i=t.currentTarget.getBoundingClientRect(),r=(t.clientY-i.top)/i.height,n=r<.25?"before":r>.75?"after":"into";(this.drop?.id!==e.id||this.drop.zone!==n)&&(this.drop={id:e.id,zone:n})}async onDrop(t,e){t.preventDefault();let i=this.drop?.zone??"into",r=this.task(this.dragId);if(this.drop=null,this.dragId=null,!r||r.id===e.id)return;if(i==="into"){await this.api.op("task_move",{task_id:r.id,parent_id:e.id,index:null}),this.save({folded:this.ui.folded.filter(c=>c!==e.id)});return}let l=this.childrenOf(e.parent_id).filter(c=>c.id!==r.id).findIndex(c=>c.id===e.id);await this.api.op("task_move",{task_id:r.id,parent_id:e.parent_id,index:i==="before"?l:l+1})}row(t){let e=t.summary,i=this.canEdit,r=this.ui.folded.includes(t.id),n=t.status==="done"||t.status==="discarded",l=this.drop?.id===t.id?`drop-${this.drop.zone}`:"";return a`
      <div
        class="task ${t.status} ${l} ${this.highlight===t.id?"hl":""}"
        data-id=${t.id}
        @dragover=${c=>this.onDragOver(c,t)}
        @dragleave=${()=>this.drop=null}
        @drop=${c=>this.onDrop(c,t)}
      >
        <div class="row nowrap" style="padding-left:${this.filtering()?0:t.depth*(this.clientWidth<600?10:18)}px">
          ${i?a`<span
                class="handle"
                draggable="true"
                title="Ziehen zum Umsortieren oder Verschieben"
                @dragstart=${c=>{this.dragId=t.id,c.dataTransfer?.setData("text/plain",t.id)}}
                @dragend=${()=>{this.dragId=null,this.drop=null}}
                >⠿</span
              >`:d}
          ${t.has_children?a`<button class="fold" @click=${()=>this.toggleFold(t.id)} title="Ein-/Ausklappen">
                ${r?"\u25B8":"\u25BE"}
              </button>`:a`<span style="width:26px"></span>`}
          <button
            class="icon"
            ?disabled=${!i}
            title=${n?"Wieder \xF6ffnen":"Als erledigt markieren"}
            @click=${()=>this.patchTask(t,{status:n?"open":"done"})}
          >
            ${t.status==="done"?"\u2611":t.status==="discarded"?"\u2298":"\u2610"}
          </button>
          <input
            class="inline title"
            .value=${t.title}
            ?disabled=${!i}
            @change=${c=>this.patchTask(t,{title:c.target.value})}
          />
          <button class="icon" title="Uhr starten" ?disabled=${!i} @click=${()=>this.startTimer(t.id)}>▶</button>
          <button class="icon" title="Details" @click=${()=>this.open=this.open===t.id?null:t.id}>
            ${this.open===t.id?"\u25B4":"\u22EF"}
          </button>
        </div>
        <div class="row chips" style="margin-left:62px;gap:4px">
          ${n?a`<span class="chip">${nt[t.status]}</span>`:t.ready?a`<span class="chip ok" title="Kann jetzt begonnen werden">${t.has_children,"bereit"}</span>`:a`<span class="chip warn" title=${this.reasonText(t)}>🔒 nicht bereit</span>`}
          ${t.status==="in_progress"?a`<span class="chip">in Arbeit</span>`:d}
          ${t.category?a`<span class="chip">${t.category}</span>`:d}
          ${t.waiting_due?a`<span class="chip err">Wartezeit erreicht</span>`:d}
          ${e.unestimated&&!n?a`<span class="chip" title="Keine Schätzung">ohne Schätzung</span>`:d}
          <up-prio-chips .st=${this.st} .api=${this.api} .item=${t}></up-prio-chips>
        </div>
        ${!t.ready&&!n&&t.reasons.length?a`<div class="reason">
              ${t.reasons.map((c,p)=>{let u=c.task_id,f=this.reasonText({...t,reasons:[c]});return a`${p?"; ":""}${u?a`<a @click=${()=>this.jumpTo(u)}>${f}</a>`:f}`})}
            </div>`:d}
        <div class="nums">
          <span
            >Geschätzt
            ${t.has_children?a`<b>${h(e.estimate_min)}</b>${e.rough_min!==null?a` (Grob ${h(e.rough_min)})`:d}${e.partial?a` <span title="Nicht alle Unteraufgaben sind geschätzt">*</span>`:d}`:a`<input
                    class="inline"
                    .value=${Nt(t.estimate_initial_min)}
                    ?disabled=${!i||t.frozen}
                    title=${t.frozen?"Mit der ersten Buchung eingefroren":"Sch\xE4tzung, z. B. 1:30"}
                    placeholder="–"
                    @change=${c=>this.editDur(t,"estimate_initial_min",c)}
                  />${t.frozen?"\u{1F512}":""}`}</span
          >
          <span>Gebucht <b>${h(e.booked_min)}</b></span>
          <span
            >Rest
            ${t.has_children?a`<b>${h(e.remaining_min)}</b>`:a`<input
                  class="inline"
                  .value=${Nt(e.remaining_min)}
                  ?disabled=${!i||n}
                  title="Restschätzung, jederzeit änderbar"
                  @change=${c=>this.editDur(t,"remaining_min",c)}
                />`}</span
          >
          <span>Prognose <b>${h(e.forecast_min)}</b>${e.deviation_min!==null?a` (<span style="color:${e.deviation_min>0?"var(--error-color)":"var(--success-color)"}">${Q(e.deviation_min)}</span>)`:d}</span
          >
          ${t.planned_min?a`<span title="In offenen Blöcken eingeplant">Eingeplant ${h(t.planned_min)}</span>`:d}
        </div>
        ${this.open===t.id?this.details(t):d}
      </div>
    `}details(t){let e=this.canEdit,i=t.summary;return a`<div class="details">
      <label>Notiz</label>
      <textarea .value=${t.notes} ?disabled=${!e} @change=${r=>this.patchTask(t,{notes:r.target.value})}></textarea>
      <div class="row">
        <div>
          <label>Status</label>
          <select ?disabled=${!e} .value=${t.status} @change=${r=>this.patchTask(t,{status:r.target.value})}>
            ${Object.keys(nt).map(r=>a`<option value=${r} ?selected=${r===t.status}>${nt[r]}</option>`)}
          </select>
        </div>
        <div>
          <label>Gewerk</label>
          <select ?disabled=${!e} @change=${r=>this.patchTask(t,{category:r.target.value||null})}>
            <option value="">–</option>
            ${this.st.settings.categories.map(r=>a`<option value=${r} ?selected=${r===t.category}>${r}</option>`)}
          </select>
        </div>
        <div>
          <label>Unteraufgaben</label>
          <select ?disabled=${!e} @change=${r=>this.patchTask(t,{children_mode:r.target.value})}>
            <option value="any" ?selected=${t.children_mode==="any"}>beliebig</option>
            <option value="sequential" ?selected=${t.children_mode==="sequential"}>der Reihe nach</option>
          </select>
        </div>
      </div>
      <table class="sumtable">
        <tr><td>Ursprüngliche Schätzung</td><td>${h(t.estimate_initial_min)}${t.frozen?" \u{1F512}":""}</td>
            <td>Summe Unteraufgaben / Schätzung</td><td>${h(i.estimate_min)}</td></tr>
        <tr><td>Gebucht (eigene Zeit)</td><td>${h(i.booked_own_min)}</td>
            <td>Helferstunden</td><td>${h(i.helper_min)}</td></tr>
        <tr><td>Aufwand</td><td>${h(i.booked_min)}</td><td>Rest</td><td>${h(i.remaining_min)}</td></tr>
        <tr><td>Prognose</td><td>${h(i.forecast_min)}</td><td>Abweichung</td><td>${Q(i.deviation_min)}</td></tr>
      </table>
      <label>Blockiert durch</label>
      <div class="row">
        ${t.blocked_by.map(r=>{let n=this.task(r);return a`<span class="chip">
            <a style="cursor:pointer" @click=${()=>this.jumpTo(r)}>${n?.title??"?"}</a>
            ${e?a`<a style="cursor:pointer" title="Entfernen" @click=${()=>this.patchTask(t,{blocked_by:t.blocked_by.filter(l=>l!==r)})}>✕</a>`:d}
          </span>`})}
        ${e?a`<button @click=${()=>this.addBlocker(t)}>+ Blockade</button>`:d}
      </div>
      <label>Wartet auf (Material, Handwerker …)</label>
      <div class="row">
        <input
          .value=${t.waiting_for??""}
          ?disabled=${!e}
          placeholder="z. B. Lieferung Holz"
          @change=${r=>this.patchTask(t,{waiting_for:r.target.value})}
        />
        <input type="date" .value=${t.waiting_until??""} ?disabled=${!e} @change=${r=>this.patchTask(t,{waiting_until:r.target.value||null})} />
        ${t.waiting_for&&e?a`<button @click=${()=>this.patchTask(t,{waiting_for:null})}>Wartezustand aufheben</button>`:d}
      </div>
      <div class="row" style="margin-top:10px">
        ${e&&!t.has_children?a`<button @click=${()=>this.plan(t)}>Einplanen …</button>`:d}
        ${e?a`<button @click=${()=>this.addTask(t)}>+ Unteraufgabe</button>`:d}
        ${e?a`<button @click=${()=>this.move(t)}>Verschieben …</button>`:d}
        ${e?a`<button class="danger right" @click=${()=>this.removeTask(t)}>Löschen …</button>`:d}
      </div>
    </div>`}render(){let t=this.ui,e=this.visible(),i=this.st.tasks.filter(r=>r.parent_id===null);return a`
      <div class="toolbar">
        <input type="search" placeholder="Suchen (Titel, Notiz)" .value=${t.search} @input=${r=>this.save({search:r.target.value})} />
        <select .value=${t.status} @change=${r=>this.save({status:r.target.value})}>
          <option value="">Status: alle</option>
          ${Object.keys(nt).map(r=>a`<option value=${r} ?selected=${t.status===r}>${nt[r]}</option>`)}
        </select>
        <select @change=${r=>this.save({category:r.target.value})}>
          <option value="">Gewerk: alle</option>
          ${this.st.settings.categories.map(r=>a`<option value=${r} ?selected=${t.category===r}>${r}</option>`)}
        </select>
        <select @change=${r=>this.save({project:r.target.value})}>
          <option value="">Projekt: alle</option>
          ${i.map(r=>a`<option value=${r.id} ?selected=${t.project===r.id}>${r.title}</option>`)}
        </select>
        <label class="row"><input type="checkbox" .checked=${t.readyOnly} @change=${r=>this.save({readyOnly:r.target.checked})} />bereit</label>
        <label class="row"><input type="checkbox" .checked=${t.hideDone} @change=${r=>this.save({hideDone:r.target.checked})} />Erledigte ausblenden</label>
      </div>
      ${this.canEdit?a`<div class="row" style="margin-bottom:8px">
            <input class="grow" placeholder="Neues Projekt … (Enter)" @keydown=${r=>this.quickAdd(r)} />
            <button @click=${()=>this.addTask(null)}>+ Projekt …</button>
          </div>`:d}
      <div class="card">
        ${e.length?e.map(r=>this.row(r)):a`<div class="empty">${this.st.tasks.length?"Keine Aufgabe passt zu den Filtern.":"Noch keine Aufgaben. Lege oben ein Projekt an."}</div>`}
      </div>
    `}};m([g()],C.prototype,"ui",2),m([g()],C.prototype,"open",2),m([g()],C.prototype,"highlight",2),m([g()],C.prototype,"drop",2);customElements.define("up-view-tasks",C);var at=class extends v{constructor(){super(...arguments);this.week="";this.data=null;this.lastRev=-1;this.lastWeek=""}static{this.styles=[...v.styles,$`
      .entry {
        display: flex;
        gap: 8px;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid var(--divider-color);
        flex-wrap: wrap;
      }
    `]}get monday(){return this.week||et(this.st.today)}willUpdate(){this.st&&(this.st.rev!==this.lastRev||this.monday!==this.lastWeek)&&(this.lastRev=this.st.rev,this.lastWeek=this.monday,this.load())}async load(){let t=this.monday,e=await this.api.ws("time_entries",{start:t,end:D(t,6)});e&&(this.data=e)}async editEntry(t){let e=this.st.timezone,i=await this.api.ui.form({title:t?"Buchung bearbeiten":"Buchung anlegen",fields:[{key:"task",label:"Aufgabe",type:"task",required:!0},{key:"start",label:"Beginn",type:"datetime",required:!0},{key:"end",label:"Ende (leer = l\xE4uft)",type:"datetime"},{key:"helper",label:"Helferstunden",type:"duration",hint:"Zeit von Helfern, zus\xE4tzlich zur eigenen Zeit"},{key:"note",label:"Notiz",type:"text"}],values:t?{task:t.task_id,start:it(t.start,e),end:t.end?it(t.end,e):"",helper:t.helper_min||null,note:t.note}:{start:it(new Date().toISOString(),e),end:""},actions:t?[{name:"delete",label:"L\xF6schen",danger:!0}]:[],submitLabel:"Speichern"});if(!i)return;if(i.action==="delete"&&t){await this.api.ui.confirm("Buchung l\xF6schen","Diese Zeitbuchung wird gel\xF6scht.",!0,"L\xF6schen")&&await this.api.op("time_entry_delete",{entry_id:t.id});return}let r=i.values,n=Pt(r.start,e),l=r.end?Pt(r.end,e):null;t?await this.api.op("time_entry_update",{entry_id:t.id,fields:{task_id:r.task,start:n,end:l,helper_min:r.helper??0,note:r.note}}):await this.api.op("time_entry_add",{task_id:r.task,start:n,end:l,helper_min:r.helper??0,note:r.note})}render(){let t=this.monday,e=Array.from({length:7},(p,u)=>D(t,u)),i=this.data,r=e.reduce((p,u)=>p+(i?.days[u]?.own??0),0),n=e.reduce((p,u)=>p+(i?.days[u]?.helper??0),0),l=new Map;for(let p of i?.entries??[]){let u=this.task(p.task_id)?.project_id??"";l.set(u,(l.get(u)??0)+(p.minutes??0))}let c=w(t);return a`
      <div class="row" style="margin-bottom:8px">
        <h2 style="margin:0">Zeiten</h2>
        <button @click=${()=>this.week=D(t,-7)}>‹</button>
        <b>Woche ab ${c.getDate()}.${c.getMonth()+1}.</b>
        <button @click=${()=>this.week=""}>Diese</button>
        <button @click=${()=>this.week=D(t,7)}>›</button>
        <span class="right"></span>
        ${this.canEdit?a`<button @click=${()=>this.editEntry(null)}>+ Buchung</button>`:d}
      </div>
      <div class="card">
        <div class="row">
          <b>Woche gesamt:</b> ${h(r)} eigene Zeit
          ${n?a`<span class="muted">+ ${h(n)} Helfer = ${h(r+n)} Aufwand</span>`:d}
        </div>
        <div class="row" style="margin-top:4px">
          ${[...l.entries()].map(([p,u])=>a`<span class="chip">${this.ttl(p)}: ${h(u)}</span>`)}
        </div>
      </div>
      ${e.map(p=>{let u=(i?.entries??[]).filter(b=>b.day===p).sort((b,E)=>b.start.localeCompare(E.start)),f=i?.days[p];return a`<div class="card">
          <div class="row"><b>${gt(p,this.st.today)}</b><span class="right muted">${f?h(f.own):"\u2013"}${f?.helper?` + ${h(f.helper)} Helfer`:""}</span></div>
          ${u.map(b=>a`<div class="entry">
              <span class="grow"><b>${b.task_title}</b> <span class="muted small">${this.projectTitle(b.task_id)}</span>${b.note?a`<div class="muted small">${b.note}</div>`:d}</span>
              <span>${Tt(b.start,this.st.timezone)} – ${b.end?Tt(b.end,this.st.timezone):"l\xE4uft"}</span>
              <span class="chip">${h(b.minutes??0)}</span>
              ${b.helper_min?a`<span class="chip">+${h(b.helper_min)} Helfer</span>`:d}
              ${this.canEdit?a`<button class="icon" title="Bearbeiten" @click=${()=>this.editEntry(b)}>✎</button>`:d}
            </div>`)}
          ${u.length?d:a`<div class="muted small">Keine Buchungen.</div>`}
        </div>`})}
    `}};m([g()],at.prototype,"week",2),m([g()],at.prototype,"data",2);customElements.define("up-view-times",at);var jt=class extends v{static{this.styles=[...v.styles,$`
      .fill {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .fill .bar {
        flex: 1;
      }
    `]}async newBlock(){let s=await this.api.ui.form({title:"Block f\xFCr heute",fields:[{key:"start_time",label:"Startzeit (optional)",type:"time"},{key:"cap",label:"Kapazit\xE4t",type:"duration",required:!0},{key:"note",label:"Notiz (z. B. Ort)",type:"text"}],values:{cap:this.st.settings.default_capacity_min},submitLabel:"Anlegen"});s&&await this.api.op("block_create",{date:this.st.today,start_time:s.values.start_time,capacity_min:s.values.cap,note:s.values.note})}async addEntry(s){let e=this.blockById(s).reserved_for,i=await this.api.ui.form({title:"Aufgabe einplanen",fields:[{key:"task",label:"Aufgabe",type:"task",required:!0,taskFilter:r=>{if(r.has_children||r.status==="done"||r.status==="discarded")return!1;if(!e)return!0;let n=r;for(;n;){if(n.id===e)return!0;n=this.task(n.parent_id)}return!1}},{key:"min",label:"Geplante Dauer (leer = Vorschlag)",type:"duration"}],submitLabel:"Einplanen"});i&&await this.api.op("entry_add",{task_id:i.values.task,block_id:s,planned_min:i.values.min})}async close(s){await this.api.ui.confirm("Block abschlie\xDFen","Danach l\xE4sst sich der Block nicht mehr planen. Unerledigtes kannst du mit \u201ENachr\xFCcken\u201C nach vorne holen.",!1,"Abschlie\xDFen")&&await this.api.op("block_close",{block_id:s})}render(){let s=this.st.today,t=this.st.blocks.filter(n=>n.date===s),e=this.st.blocks.filter(n=>n.date<s||n.closed).some(n=>this.st.entries.some(l=>l.block_id===n.id&&!l.superseded&&this.task(l.task_id)?.status!=="done"&&this.task(l.task_id)?.status!=="discarded")),i=this.st.warnings.filter(n=>n.date===s),r=this.st.entries.filter(n=>t.some(l=>l.id===n.block_id)&&!n.superseded).reduce((n,l)=>n+l.planned_min,0);return a`
      <div class="row" style="margin-bottom:8px">
        <h2 style="margin:0">Heute</h2>
        <span class="muted">${x(r)} geplant</span>
        <span class="right"></span>
        ${this.canEdit?a`<button @click=${()=>this.api.ui.rolloverFlow()} class=${e?"primary":""}>Nachrücken …</button>`:d}
        ${this.st.can_undo_rollover&&this.canEdit?a`<button @click=${()=>this.api.op("rollover_undo")}>Nachrücken rückgängig</button>`:d}
      </div>
      ${e?a`<div class="warning-box">In vergangenen Blöcken ist Unerledigtes. „Nachrücken“ verteilt es auf die kommenden Blöcke.</div>`:d}
      ${i.map(n=>a`<div class="warning-box">⚠ „${n.task_title}“ (heute${n.fixed?", fixiert":""}): Voraussetzung „${n.prerequisite_title}“ ist nicht rechtzeitig eingeplant.</div>`)}
      ${t.length?t.map(n=>{let l=Math.min(100,Math.round(n.fill_min/Math.max(1,n.capacity_min)*100));return a`<div class="card">
              <div class="row">
                <b>${n.start_time?`Block ab ${n.start_time}`:"Arbeitsblock"}</b>
                ${n.reserved_for?a`<span class="chip">reserviert: ${this.ttl(n.reserved_for)}</span>`:d}
                ${n.closed?a`<span class="chip">abgeschlossen</span>`:d}
                ${n.note?a`<span class="muted">${n.note}</span>`:d}
              </div>
              <div class="fill" style="margin:6px 0">
                <div class="bar ${n.overbooked?"over":""}"><span style="width:${l}%"></span></div>
                <span class=${n.overbooked?"chip err":""}>${x(n.fill_min)} von ${x(n.capacity_min)}</span>
              </div>
              ${n.overbooked?a`<div class="error-box">Überbucht um ${h(n.fill_min-n.capacity_min)}</div>`:d}
              ${this.entriesOf(n.id).filter(c=>!c.superseded).map(c=>a`<up-entry .st=${this.st} .api=${this.api} .entry=${c}></up-entry>`)}
              ${this.entriesOf(n.id).length?d:a`<div class="muted">Noch nichts eingeplant.</div>`}
              ${this.canEdit?a`<div class="row" style="margin-top:6px">
                    ${n.closed?d:a`<button @click=${()=>this.addEntry(n.id)}>+ Aufgabe</button>`}
                    ${n.closed?d:a`<button
                          @click=${async()=>{let c=await this.api.ws("suggest_fill",{block_id:n.id});if(!c?.length)return this.api.ui.toast("Keine passenden bereiten Aufgaben gefunden.");await this.api.ui.confirm("Bef\xFCllung vorschlagen",c.map(u=>`\u2022 ${u.title} \u2013 ${h(u.planned_min)}`).join(`
`),!1,"\xDCbernehmen")&&await this.api.op("entries_add_many",{block_id:n.id,items:c})}}
                        >
                          Vorschlag nach Priorität
                        </button>`}
                    ${n.closed?d:a`<button class="right" @click=${()=>this.close(n.id)}>Block abschließen</button>`}
                  </div>`:d}
            </div>`}):a`<div class="card empty">
            Heute ist kein Arbeitsblock angelegt.
            ${this.canEdit?a`<div><button class="primary" @click=${()=>this.newBlock()}>Block für heute anlegen</button></div>`:d}
          </div>`}
      ${t.length&&this.canEdit?a`<button @click=${()=>this.newBlock()}>+ weiterer Block heute</button>`:d}
    `}};customElements.define("up-view-today",jt);var De=[{key:"today",label:"Heute",icon:"\u2600"},{key:"tasks",label:"Aufgaben",icon:"\u2630"},{key:"ready",label:"Jetzt m\xF6glich",icon:"\u2714"},{key:"calendar",label:"Kalender",icon:"\u25A6"},{key:"disagree",label:"Uneinig",icon:"\u2260"},{key:"times",label:"Zeiten",icon:"\u25F7"},{key:"evaluation",label:"Auswertung",icon:"\u25A4"},{key:"settings",label:"Einstellungen",icon:"\u2699"}];function ze(o){let s=Math.max(0,Math.floor(o/1e3)),t=Math.floor(s/3600),e=Math.floor(s%3600/60),i=s%60;return`${t}:${String(e).padStart(2,"0")}:${String(i).padStart(2,"0")}`}var k=class extends _{constructor(){super(...arguments);this.narrow=!1;this.st=null;this.view=localStorage.getItem("umbau_planer_view")||"today";this.toasts=[];this.forms=[];this.rollover=!1;this.tick=0;this.error="";this.timers=[];this.dirty=!1;this.toastId=0;this.ui={toast:(t,e={})=>{let i=++this.toastId;this.toasts=[...this.toasts,{id:i,message:t,...e}],window.setTimeout(()=>this.toasts=this.toasts.filter(r=>r.id!==i),e.timeout??(e.kind==="error"?7e3:4e3))},form:t=>new Promise(e=>{this.forms=[...this.forms,{spec:t,resolve:e}]}),confirm:async(t,e,i=!1,r="OK")=>!!await this.ui.form({title:t,message:e,danger:i,submitLabel:r}),rolloverFlow:async()=>{this.rollover=!0},setDirty:t=>this.dirty=t}}static{this.styles=[U,$`
      :host {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--primary-background-color);
      }
      header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 0 8px;
        height: 56px;
        background: var(--app-header-background-color, var(--primary-color));
        color: var(--app-header-text-color, #fff);
        position: sticky;
        top: 0;
        z-index: 5;
      }
      header h1 {
        font-size: 20px;
        font-weight: 400;
        margin: 0;
      }
      nav {
        display: flex;
        gap: 2px;
        overflow-x: auto;
        background: var(--card-background-color);
        border-bottom: 1px solid var(--divider-color);
        position: sticky;
        top: 56px;
        z-index: 4;
        scrollbar-width: thin;
      }
      nav button {
        border: none;
        border-bottom: 3px solid transparent;
        border-radius: 0;
        background: none;
        padding: 8px 12px;
        white-space: nowrap;
        min-height: 44px;
      }
      nav button.active {
        border-bottom-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: 500;
      }
      main {
        flex: 1;
        padding: 12px;
        max-width: 1100px;
        width: 100%;
        margin: 0 auto;
      }
      .timerbar {
        position: sticky;
        bottom: 0;
        z-index: 6;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: var(--card-background-color);
        border-top: 2px solid var(--primary-color);
        flex-wrap: wrap;
      }
      .timerbar.running {
        background: color-mix(in srgb, var(--success-color, #43a047) 18%, var(--card-background-color));
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--success-color, #43a047);
        animation: pulse 1.5s infinite;
      }
      @keyframes pulse {
        50% {
          opacity: 0.3;
        }
      }
      .clock {
        font-variant-numeric: tabular-nums;
        font-weight: 500;
        font-size: 18px;
      }
      .toasts {
        position: fixed;
        left: 8px;
        right: 8px;
        bottom: 70px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: center;
        z-index: 30;
        pointer-events: none;
      }
      .toast {
        pointer-events: auto;
        background: #323232;
        color: #fff;
        padding: 10px 14px;
        border-radius: 8px;
        max-width: 560px;
        display: flex;
        gap: 12px;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
      }
      .toast.error {
        background: #b3261e;
      }
      .toast.warn {
        background: #8a5a00;
      }
      .toast button {
        background: none;
        color: #ffd54f;
        border: none;
        font-weight: 500;
      }
      .badge {
        background: var(--primary-color);
        color: var(--text-primary-color, #fff);
        border-radius: 999px;
        font-size: 11px;
        padding: 0 6px;
        margin-left: 4px;
      }
      .offline {
        padding: 24px;
        text-align: center;
      }
    `]}connectedCallback(){super.connectedCallback(),this.timers.push(window.setInterval(()=>this.tick=Date.now(),1e3)),this.timers.push(window.setInterval(()=>void this.refresh(),6e4))}disconnectedCallback(){super.disconnectedCallback(),this.timers.forEach(t=>clearInterval(t)),this.timers=[],this.unsub?.(),this.unsub=void 0}willUpdate(t){t.has("hass")&&this.hass&&(this.api?this.api.hass=this.hass:(this.api=new mt(this.hass,this.ui),this.start()))}async start(){await this.refresh();try{this.unsub=await this.hass.connection.subscribeMessage(()=>{window.clearTimeout(this.refreshHandle),this.refreshHandle=window.setTimeout(()=>void this.refresh(),80)},{type:"umbau_planer/subscribe"})}catch(t){this.error=t?.message??String(t)}}async refresh(){if(this.api)try{this.st=await this.api.fetchState(),this.error=""}catch(t){this.st||(this.error=t?.message??"Der Umbau-Planer ist nicht erreichbar.")}}async go(t){if(t!==this.view){if(this.dirty&&this.forms.length){if(!window.confirm("Ungespeicherte Eingaben gehen verloren. Ansicht trotzdem wechseln?"))return;this.forms.forEach(i=>i.resolve(null)),this.forms=[],this.dirty=!1}this.view=t;try{localStorage.setItem("umbau_planer_view",t)}catch{}window.scrollTo(0,0)}}async stop(){let t=this.st,e=t.timer.running,i=t.tasks.find(n=>n.id===e.task_id),r=await this.ui.form({title:`Stopp: ${i?.title??"Aufgabe"}`,message:"Optional: Aufgabe abschlie\xDFen oder die Restsch\xE4tzung anpassen. Du kannst auch einfach nur stoppen.",fields:i&&!i.has_children?[{key:"rest",label:"Restsch\xE4tzung",type:"duration",hint:"Aktuell "+h(i.summary.remaining_min)}]:[],values:{rest:i?.summary.remaining_min},actions:[{name:"done",label:"Stopp & erledigt"},{name:"skip",label:"Nur stoppen"}],submitLabel:"Stopp & Rest \xFCbernehmen"});r&&(r.action==="done"?await this.api.op("timer_stop",{mark_done:!0}):r.action==="skip"?await this.api.op("timer_stop"):await this.api.op("timer_stop",{remaining_min:r.values.rest??void 0}))}timerBar(){let t=this.st,e=t.timer.running,i=t.me.can_edit;if(e){let n=t.tasks.find(c=>c.id===e.task_id),l=Date.now()-Date.parse(e.start);return this.tick,a`<div class="timerbar running">
        <span class="dot"></span>
        <div class="grow">
          <b>${n?.title??"?"}</b>
          <div class="muted small">${n?t.tasks.find(c=>c.id===n.project_id)?.title:""}</div>
        </div>
        <span class="clock">${ze(l)}</span>
        ${i?a`<button class="primary" @click=${()=>this.stop()}>■ Stopp</button>`:d}
      </div>`}let r=t.tasks.find(n=>n.id===t.timer.last_task_id);return a`<div class="timerbar">
      <span class="muted grow">Keine Uhr läuft</span>
      ${i&&r?a`<button @click=${()=>this.api.op("timer_resume")}>▶ Fortsetzen: ${r.title}</button>`:d}
    </div>`}content(){let e={st:this.st,api:this.api};switch(this.view){case"tasks":return a`<up-view-tasks .st=${e.st} .api=${e.api}></up-view-tasks>`;case"ready":return a`<up-view-ready .st=${e.st} .api=${e.api}></up-view-ready>`;case"calendar":return a`<up-view-calendar .st=${e.st} .api=${e.api}></up-view-calendar>`;case"disagree":return a`<up-view-disagree .st=${e.st} .api=${e.api}></up-view-disagree>`;case"times":return a`<up-view-times .st=${e.st} .api=${e.api}></up-view-times>`;case"evaluation":return a`<up-view-evaluation .st=${e.st} .api=${e.api}></up-view-evaluation>`;case"settings":return a`<up-view-settings .st=${e.st} .api=${e.api}></up-view-settings>`;default:return a`<up-view-today .st=${e.st} .api=${e.api}></up-view-today>`}}render(){let t=this.st,e=this.forms[this.forms.length-1];return a`
      <header>
        <ha-menu-button .hass=${this.hass} .narrow=${this.narrow}></ha-menu-button>
        <h1>Umbau-Planer</h1>
      </header>
      ${t?a`
            <nav>
              ${De.map(i=>a`<button class=${this.view===i.key?"active":""} @click=${()=>this.go(i.key)}>
                  ${i.icon} ${i.label}${i.key==="disagree"&&t.disagree_ids.length?a`<span class="badge">${t.disagree_ids.length}</span>`:i.key==="ready"&&t.ready_ids.length?a`<span class="badge">${t.ready_ids.length}</span>`:d}
                </button>`)}
            </nav>
            <main>
              ${t.settings.persons.length===0&&this.view!=="settings"?a`<div class="warning-box">
                    Noch keine Personen eingerichtet. Lege unter <a style="cursor:pointer;text-decoration:underline" @click=${()=>this.go("settings")}>Einstellungen</a> die Personen an
                    und ordne sie Home-Assistant-Benutzern zu, damit Prioritäten vergeben werden können.
                  </div>`:d}
              ${this.content()}
            </main>
            ${this.timerBar()}
          `:a`<main><div class="offline">${this.error?a`<div class="error-box">${this.error}</div>`:"Lade \u2026"}</div></main>`}
      ${e?a`<up-form-dialog
            .spec=${e.spec}
            .tasks=${t?.tasks??[]}
            .dirtyChanged=${i=>this.dirty=i}
            .done=${i=>{this.forms=this.forms.filter(r=>r!==e),e.resolve(i)}}
          ></up-form-dialog>`:d}
      ${this.rollover&&t&&this.api?a`<up-rollover-dialog .st=${t} .api=${this.api} .done=${()=>this.rollover=!1}></up-rollover-dialog>`:d}
      <div class="toasts">
        ${this.toasts.map(i=>a`<div class="toast ${i.kind??""}">
            <span>${i.message}</span>
            ${i.action?a`<button
                  @click=${()=>{i.action.run(),this.toasts=this.toasts.filter(r=>r.id!==i.id)}}
                >
                  ${i.action.label}
                </button>`:d}
          </div>`)}
      </div>
    `}};m([y({attribute:!1})],k.prototype,"hass",2),m([y({type:Boolean})],k.prototype,"narrow",2),m([y({attribute:!1})],k.prototype,"route",2),m([y({attribute:!1})],k.prototype,"panel",2),m([g()],k.prototype,"st",2),m([g()],k.prototype,"view",2),m([g()],k.prototype,"toasts",2),m([g()],k.prototype,"forms",2),m([g()],k.prototype,"rollover",2),m([g()],k.prototype,"tick",2),m([g()],k.prototype,"error",2);customElements.define("umbau-planer-panel",k);export{k as UmbauPlanerPanel};
