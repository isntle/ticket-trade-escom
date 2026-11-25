import React from 'react';
import {SimboloTicketTrade} from './SimboloTicketTrade';

/** Marco compartido por acceso, registro, confirmación y recuperación. */
export function MarcoAcceso({children}:{children:React.ReactNode}){
 return <section style={{fontFamily:"var(--fuente-principal)"}} className="min-h-dvh bg-[#faf9f8] p-0 lg:p-6">
  <div className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-[1600px] grid-cols-1 items-start lg:grid-cols-[1.05fr_1fr]">
   <aside className="relative order-2 h-72 overflow-hidden lg:sticky lg:top-6 lg:order-1 lg:h-[calc(100dvh-3rem)] lg:rounded-[24px]">
    <img src="/imagenes/eventos/expo-escom.jpg" alt="Personas colaborando frente a una computadora" className="absolute inset-0 h-full w-full object-cover object-right" />
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-7 pb-8 pt-28 lg:px-9 lg:pb-10">
     <h2 className="max-w-sm text-3xl font-bold leading-tight tracking-tight text-white lg:text-[clamp(1.8rem,2.6vw,2.6rem)]">Las mejores ideas empiezan juntos.</h2>
     <p className="mt-4 max-w-sm text-sm leading-6 text-white/85">Conferencias, talleres y encuentros que forman parte de tu vida académica.</p>
    </div>
   </aside>
   <div className="order-1 flex min-w-0 flex-col px-6 pb-10 pt-8 sm:px-10 lg:order-2 lg:min-h-[calc(100dvh-3rem)] lg:px-[clamp(2rem,5vw,5rem)] lg:pt-8">
    <div className="mb-10 flex items-center justify-center gap-2.5 text-[#70162c] lg:mb-14">
     <SimboloTicketTrade className="h-8 w-9 shrink-0" />
     <span className="text-2xl font-bold tracking-tight">Ticket Trade</span>
    </div>
    <div className="mx-auto my-auto w-full max-w-[460px]">{children}</div>
   </div>
  </div>
 </section>;
}
