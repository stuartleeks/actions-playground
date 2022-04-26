makefile_fullpath := $(abspath $(lastword $(MAKEFILE_LIST)))
# makefile_dir := $(notdir $(patsubst %/,%,$(dir $(mkfile_fullpath))))
makefile_dir := $(dir $(makefile_fullpath))

ping:
	@echo "hi"

test-fake:
	@echo ${PWD}
	@echo ${makefile_dir}
	@"${makefile_dir}/fake.sh"
