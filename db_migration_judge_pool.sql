-- Add judge_name_pool column to app_settings table
alter table app_settings 
add column if not exists judge_name_pool text[] default '{}';

-- Initialize with default names if empty
update app_settings 
set judge_name_pool = array['Juez A', 'Juez B', 'Juez C', 'Juez D']
where id = 1 and (judge_name_pool is null or cardinality(judge_name_pool) = 0);
