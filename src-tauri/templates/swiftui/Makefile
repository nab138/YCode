TARGET = iphone:clang:latest:16.5
INSTALL_TARGET_PROCESSES = {{projectName}}
PACKAGE_FORMAT=ipa
ARCHS = arm64

include $(THEOS)/makefiles/common.mk

APPLICATION_NAME = {{projectName}}

{{projectName}}_FILES = $(shell find src -name '*.swift' | grep -v '/Package.swift$$')

include $(THEOS_MAKE_PATH)/application.mk
