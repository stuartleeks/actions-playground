const { createHash } = require('crypto');

async function getCommand({ context, core, github }) {
	console.log(context);
	console.log("==========================================================================================")
	console.log(context.payload);
	console.log("==========================================================================================")

	const commentUsername = context.payload.comment.user.login;
	const repoFullName = context.payload.repository.full_name;
	const repoParts = repoFullName.split("/");
	const repoOwner = repoParts[0];
	const repoName = repoParts[1];

	// only allow actions for users with write access
	if (!await userHasWriteAccessToRepo({ github }, commentUsername, repoOwner, repoName)) {
		console.log("Command: none [user doesn't have write permission]");
		return "none";
	}

	const commentBody = context.payload.comment.body;
	const commentFirstLine = commentBody.split("\n")[0];

	core.setOutput("testOutput1", false);
	core.setOutput("testOutput2", "Hello!");

	const prNumber = context.payload.issue.number;
	const pr = await github.rest.pulls.get({ owner: repoOwner, repo: repoName, pull_number: prNumber });
	console.log("==========================================================================================")
	console.log(pr);
	console.log("==========================================================================================")

	const prRefId = getRefIdForPr(prNumber);
	console.log(`prRefId: ${prRefId}`);
	core.setOutput("prRefId", prRefId);

	const potentialMergeCommit = pr.merge_commit_sha;
	console.log(`potentialMergeCommit: ${potentialMergeCommit}`);
	core.setOutput("potentialMergeCommit", potentialMergeCommit);

	switch (commentFirstLine.trim()) {
		case "/test":
			console.log("Result: run-tests");
			return "run-tests";
		case "/help":
			console.log("Result: show-help");
			return "show-help";
		default:
			console.log("in default")
			return "none";
	}
}


async function userHasWriteAccessToRepo({ github }, username, repoOwner, repoName) {
	// Previously, we attempted to use github.event.comment.author_association to check for OWNER or COLLABORATOR
	// Unfortunately, that always shows MEMBER if you are in the microsoft org and have that set to publicly visible
	// (Can check via https://github.com/orgs/microsoft/people?query=<username>)

	// https://docs.github.com/en/rest/reference/collaborators#check-if-a-user-is-a-repository-collaborator
	let userHasWriteAccess = false;
	try {
		console.log(`Checking if user "${username}" has write access to ${repoOwner}/${repoName} ...`)
		const result = await github.request('GET /repos/{owner}/{repo}/collaborators/{username}', {
			owner: repoOwner,
			repo: repoName,
			username
		});
		userHasWriteAccess = result.status === 204;
	} catch (err) {
		if (err.status === 404) {
			console.log("User not found in collaborators");
		} else {
			console.log(`Error checking if user has write access: ${err.status} (${err.response.data.message}) `)
		}
	}
	console.log("User has write access: " + userHasWriteAccess);
	return userHasWriteAccess
}

function getRefIdForPr(prNumber) {
	// Determine newline is for compatibility with previous bash SHA calculation
	return createShortHash(`refs/pull/${prNumber}/merge\n`);
}
function createShortHash(ref) {
	const hash = createHash('sha1').update(ref, 'utf8').digest('hex')
	return hash.substring(0, 8);
}

module.exports = {
	getCommand
}