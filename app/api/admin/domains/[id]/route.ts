import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

const schema=z.object({
  description:z.string().trim().max(5000),
  minimumTeamSize:z.number().int().min(1).nullable(),
  maximumTeamSize:z.number().int().min(1).nullable(),
  registrationOpen:z.boolean(),
  isActive:z.boolean(),
  eventDetails:z.record(z.unknown()),
}).superRefine((v,ctx)=>{
  if(v.minimumTeamSize!==null&&v.maximumTeamSize!==null&&v.maximumTeamSize<v.minimumTeamSize)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Maximum team size must be at least the minimum.'});
  if(v.registrationOpen&&!v.isActive)ctx.addIssue({code:z.ZodIssueCode.custom,message:'An inactive domain cannot accept registrations.'});
  if(JSON.stringify(v.eventDetails).length>50000)ctx.addIssue({code:z.ZodIssueCode.custom,message:'Challenge details are too large.'});
});

export async function PATCH(request:Request,{params}:{params:{id:string}}){
  const {supabase,user,role}=await getAuthenticatedContext();
  if(!supabase)return NextResponse.json({error:'Supabase is not configured.'},{status:503});
  if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
  if(role!=='admin')return NextResponse.json({error:'Administrator role required.'},{status:403});
  const parsed=schema.safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues[0]?.message??'Check domain settings.'},{status:400});
  const v=parsed.data;
  const {data,error}=await supabase.from('domains').update({description:v.description,minimum_team_size:v.minimumTeamSize,maximum_team_size:v.maximumTeamSize,registration_open:v.registrationOpen,is_active:v.isActive,event_details:v.eventDetails}).eq('id',params.id).select('id').maybeSingle();
  if(error)return NextResponse.json({error:'Domain settings could not be saved.'},{status:400});
  if(!data)return NextResponse.json({error:'Domain not found or permission denied.'},{status:404});
  return NextResponse.json({ok:true});
}
