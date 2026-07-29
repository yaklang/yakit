#!/bin/bash

git tag -d $1 && git push origin -d $1
