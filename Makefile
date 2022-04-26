test-workflow:
	(cd .github/workflows/ && yarn test)
	
test-workflow-watch:
	(cd .github/workflows/ && yarn test-watch)

include test/Makefile

