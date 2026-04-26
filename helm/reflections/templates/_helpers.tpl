{{- define "reflections.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "reflections.image" -}}
{{- $reg := .Values.image.registry -}}
{{- $name := .name -}}
{{- $tag := .tag -}}
{{- if $reg }}{{ $reg }}/{{ $name }}:{{ $tag }}{{- else }}{{ $name }}:{{ $tag }}{{- end }}
{{- end }}

{{- define "reflections.backendImage" -}}
{{- include "reflections.image" (dict "Values" .Values "name" .Values.backend.image.name "tag" .Values.backend.image.tag) }}
{{- end }}

{{- define "reflections.frontendImage" -}}
{{- include "reflections.image" (dict "Values" .Values "name" .Values.frontend.image.name "tag" .Values.frontend.image.tag) }}
{{- end }}

{{- define "reflections.postgresImage" -}}
{{- include "reflections.image" (dict "Values" .Values "name" .Values.postgres.image.name "tag" .Values.postgres.image.tag) }}
{{- end }}

{{- define "reflections.secretName" -}}
{{- if .Values.backend.existingSecret }}{{ .Values.backend.existingSecret }}{{- else }}{{ include "reflections.fullname" . }}-secrets{{- end }}
{{- end }}

{{- define "reflections.postgresSecretName" -}}
{{- if .Values.postgres.existingSecret }}{{ .Values.postgres.existingSecret }}{{- else }}{{ include "reflections.fullname" . }}-secrets{{- end }}
{{- end }}
