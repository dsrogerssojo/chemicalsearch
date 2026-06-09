const requiredForTeamsWorkflow = [
  'POWER_AUTOMATE_WEBHOOK_URL',
  'POWER_AUTOMATE_SHARED_SECRET',
  'REVIEW_CALLBACK_SECRET'
];

const requiredForGithubWriteback = [
  'GITHUB_TOKEN',
  'GITHUB_REPO',
  'GITHUB_APPROVED_FILE',
  'GITHUB_BRANCH'
];

const recommendedForFrontendRefresh = [
  'FRONTEND_DEPLOY_HOOK_URL'
];

const optionalSearchProviders = [
  'BRAVE_SEARCH_API_KEY',
  'GOOGLE_CSE_API_KEY',
  'GOOGLE_CSE_CX'
];

function isSet(name) {
  return Boolean(String(process.env[name] || '').trim());
}

function printGroup(title, names) {
  console.log(`\n${title}`);
  for (const name of names) {
    console.log(`${isSet(name) ? 'OK' : 'MISSING'} ${name}`);
  }
}

console.log('ChemicalSearch backend environment check');
printGroup('Teams review workflow', requiredForTeamsWorkflow);
printGroup('GitHub approved-record writeback', requiredForGithubWriteback);
printGroup('Frontend refresh after approval', recommendedForFrontendRefresh);
printGroup('Optional SDS search providers', optionalSearchProviders);

const missingTeamsWorkflow = requiredForTeamsWorkflow.filter((name) => !isSet(name));
const missingGithubWriteback = requiredForGithubWriteback.filter((name) => !isSet(name));

if (missingTeamsWorkflow.length) {
  console.log('\nTeams workflow is not fully configured. Request submission may only work locally or may not reach Teams.');
}

if (missingGithubWriteback.length) {
  console.log('\nGitHub writeback is not fully configured. Approved chemicals may only be saved locally on the backend instance.');
}

if (!isSet('FRONTEND_DEPLOY_HOOK_URL')) {
  console.log('\nFRONTEND_DEPLOY_HOOK_URL is not set. Approved records can still be written to GitHub, but the static frontend will not redeploy automatically.');
}

if (!isSet('ALLOWED_ORIGINS')) {
  console.log('\nALLOWED_ORIGINS is not set. The backend will allow all origins. Set this in production.');
}

console.log('\nEnvironment check complete. Missing optional providers are okay.');
