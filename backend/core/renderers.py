from rest_framework.renderers import JSONRenderer

class CustomJSONRenderer(JSONRenderer):
    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is not None and isinstance(data, dict):
            # If it's already wrapped, don't wrap it again
            if 'success' in data and len(data) <= 2 and ('data' in data or 'error' in data):
                return super().render(data, accepted_media_type, renderer_context)

        response = renderer_context['response']
        
        if response.status_code == 204:
            return b''

        if response.status_code >= 400:
            wrapper = {
                'success': False,
                'error': data if data else 'An error occurred'
            }
        else:
            wrapper = {
                'success': True,
                'data': data
            }
            
        return super().render(wrapper, accepted_media_type, renderer_context)
