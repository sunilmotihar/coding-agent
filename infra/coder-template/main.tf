terraform {
  required_providers {
    coder = {
      source = "coder/coder"
    }
    docker = {
      source = "kreuzwerker/docker"
    }
  }
}

data "coder_workspace" "me" {}
data "coder_workspace_owner" "me" {}

resource "coder_agent" "main" {
  arch = "arm64"
  os   = "linux"

  startup_script = <<-EOT
    set -e
    # Install git and basic tools if not present
    which git || (apt-get update -qq && apt-get install -y -qq git curl)
  EOT
}

resource "docker_image" "workspace" {
  name = "codercom/enterprise-base:ubuntu"
  keep_locally = true
}

resource "docker_container" "workspace" {
  image   = docker_image.workspace.image_id
  name    = "coder-${data.coder_workspace_owner.me.name}-${lower(data.coder_workspace.me.name)}"
  command = ["sh", "-c", coder_agent.main.init_script]

  env = [
    "CODER_AGENT_TOKEN=${coder_agent.main.token}",
  ]

  # Allow the container to use the host network for git operations
  network_mode = "bridge"

  volumes {
    container_path = "/home/coder"
    volume_name    = docker_volume.home.name
    read_only      = false
  }
}

resource "docker_volume" "home" {
  name = "coder-${data.coder_workspace_owner.me.name}-${lower(data.coder_workspace.me.name)}-home"
}
