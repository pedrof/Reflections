{{- define "reflections.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/* Build image string — uses per-image registry override if set, else global registry */}}
{{- define "reflections.image" -}}
{{- $reg := .registry | default .Values.image.registry -}}
{{- $name := .name -}}
{{- $tag := .tag -}}
{{- if $reg }}{{ $reg }}/{{ $name }}:{{ $tag }}{{- else }}{{ $name }}:{{ $tag }}{{- end }}
{{- end }}

{{- define "reflections.backendImage" -}}
{{- include "reflections.image" (dict "Values" .Values "registry" .Values.backend.image.registry "name" .Values.backend.image.name "tag" .Values.backend.image.tag) }}
{{- end }}

{{- define "reflections.frontendImage" -}}
{{- include "reflections.image" (dict "Values" .Values "registry" .Values.frontend.image.registry "name" .Values.frontend.image.name "tag" .Values.frontend.image.tag) }}
{{- end }}

{{- define "reflections.postgresImage" -}}
{{- include "reflections.image" (dict "Values" .Values "registry" .Values.postgres.image.registry "name" .Values.postgres.image.name "tag" .Values.postgres.image.tag) }}
{{- end }}

{{- define "reflections.secretName" -}}
{{- if .Values.backend.existingSecret }}{{ .Values.backend.existingSecret }}{{- else }}{{ include "reflections.fullname" . }}-secrets{{- end }}
{{- end }}

{{- define "reflections.postgresSecretName" -}}
{{- if .Values.postgres.existingSecret }}{{ .Values.postgres.existingSecret }}{{- else }}{{ include "reflections.fullname" . }}-secrets{{- end }}
{{- end }}
