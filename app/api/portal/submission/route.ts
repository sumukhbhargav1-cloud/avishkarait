import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthenticatedContext } from '@/lib/auth/require-user';

const schema=z.object({teamId:z.string().uuid(),projectTitle:z.string().trim().min(2).max(160),summary:z.string().trim().min(10).max(10000),demoUrl:z.union([z.literal(''),z.string().url()]).optional(),repositoryUrl:z.union([z.literal(''),z.string().url()]).optional()});
export async function POST(request:Request){
  const {supabase,user}=await getAuthenticatedContext();if(!supabase)return NextResponse.json({error:'Supabase is not configured.'},{status:503});if(!user)return NextResponse.json({error:'Sign in to submit.'},{status:401});
  const payload=await request.json().catch(()=>null),parsed=schema.safeParse(payload);if(!parsed.success)return NextResponse.json({error:'Check the project title, summary and URLs.'},{status:400});
  const {data:team}=await supabase.from('teams').select('id').eq('id',parsed.data.teamId).eq('leader_id',user.id).maybeSingle();if(!team)return NextResponse.json({error:'This team is not managed by the signed-in team leader.'},{status:404});
  const {data:existing}=await supabase.from('submissions').select('id,status').eq('team_id',team.id).maybeSingle();if(existing)return NextResponse.json({error:'A final submission already exists. Contact the event administrator for changes.'},{status:409});
  const {error}=await supabase.from('submissions').insert({team_id:team.id,submitted_by:user.id,project_title:parsed.data.projectTitle,summary:parsed.data.summary,demo_url:parsed.data.demoUrl||null,repository_url:parsed.data.repositoryUrl||null});if(error)return NextResponse.json({error:error.code==='23505'?'A final submission already exists.': 'Submission could not be saved.'},{status:error.code==='23505'?409:500});return NextResponse.json({ok:true},{status:201});
}
