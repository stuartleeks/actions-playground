modules.exports = ({context}) => {
	console.log(context);
	console.log("==========================================================================================")
	console.log(context.payload);
	console.log("==========================================================================================")

	//// https://docs.github.com/en/rest/reference/collaborators#check-if-a-user-is-a-repository-collaborator
	//const commentUsername = context.payload.comment.user.login;
	//const repoFullName = context.payload.repository.full_name;
	//const repoParts = repoFullName.split("/");
	//const repoOwner = repoParts[0];
	//const repoName = repoParts[1];
	//
	//let userHasWriteAccess = false;
	//try {
	//  console.log(`Checking if user "${commentUsername}" has write access to ${repoOwner}/${repoName} ...`)
	//  const result = await github.request('GET /repos/{owner}/{repo}/collaborators/{username}', {
	//    owner: repoOwner,
	//    repo: repoName,
	//    username: commentUsername
	//  });
	//  const userHasWriteAccess = result.status == 204;
	//  console.log(result);
	//} catch (err) {
	//  if (err.status !== 404){
	//    console.log(`Error checking if user has write access: ${err.status} (${err.response.data.message}) `)
	//  }
	//}
	//console.log("User has write access: " + userHasWriteAccess);
	//
	//if (!userHasWriteAccess){
	//  // only allow users with write access to run commands
	//  return "none";
	//}

	const commentBody = context.payload.comment.body;
	const commentFirstLine = commentBody.split("\n")[0];

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