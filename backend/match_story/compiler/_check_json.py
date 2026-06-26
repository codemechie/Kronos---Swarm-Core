import json

with open("backend/docs/datasets/json/argentina_france_2022_timeline.json", "r") as f:
    data = json.load(f)

print(f"Events: {len(data['timeline'])}")
print(f"Schema version: {data['schema_version']}")
print(f"Match ID: {data['match_id']}")
print(f"Metadata: {json.dumps(data['metadata'], indent=2)}")
print()

for e in data["timeline"]:
    if e["event_type"] == "GOAL":
        print(f"GOAL example ({e['id']}):")
        print(json.dumps(e, indent=2))
        break

print()

all_ids = [e["id"] for e in data["timeline"]]
print(f"Unique IDs: {len(set(all_ids))} == {len(all_ids)}")
print(f"Chronological: {all(e['minute'] <= data['timeline'][i+1]['minute'] for i, e in enumerate(data['timeline'][:-1]))}")
