import {
	AnimationState,
	AnimationTable,
	AnimationTimer,
} from "../components/animationComponent";
import { CollidedComponent } from "../components/collidedComponent";
import { ColliderComponent } from "../components/colliderComponent";
import { CounterComponent } from "../components/counterComponent";
import { FacingComponent } from "../components/facingComponent";
import { FollowCameraComponent } from "../components/followCameraComponent";
import { FPSComponent } from "../components/fpsComponent";
import { Gravity } from "../components/gravityComponent";
import { InputComponent } from "../components/inputComponent";
import { JumpComponent } from "../components/jumpComponent";
import { MovementComponent } from "../components/movementComponent";
import { CoinComponent } from "../components/coinComponent";
import { RocketBoosterComponent } from "../components/rocketBoosterComponent";
import { RocketFlightComponent } from "../components/rocketFlightComponent";
import { PlayerComponent } from "../components/playerComponent";
import { PlatformComponent } from "../components/platformComponent";
import { PlatformSpawner } from "../components/platformSpawnerComponent";
import { TransformComponent } from "../components/transformComponent";
import { PrimitiveRenderComponent } from "../components/renderableComponent";
import { RenderLayerComponent } from "../components/renderLayerComponent";
import { SpriteRenderComponent } from "../components/spriteRenderComponent";
import { TextRenderComponent } from "../components/textRenderComponent";
import { VelocityComponent } from "../components/velocityComponent";
import { Camera } from "../components/cameraComponent";
import type { World } from "../core/world";
import { AnimatedSpriteSystem } from "../systems/animatedSpriteSystem";
import { AudioSystem } from "../systems/audioSystem";
import { CameraSystem } from "../systems/cameraSystem";
import { CoinSystem } from "../systems/coinSystem";
import { RocketBoosterSystem } from "../systems/rocketBoosterSystem";
import { RocketFlightSystem } from "../systems/rocketFlightSystem";
import { CounterSystem } from "../systems/counterSystem";
import { DeathSystem } from "../systems/deathSystem";
import { FacingSystem } from "../systems/facingSystem";
import { FPSSystem } from "../systems/fpsSystem";
import { InputSystem } from "../systems/inputSystem";
import { JumpSystem } from "../systems/jumpSystem";
import { MovementSystem } from "../systems/movementSystem";
import { PhysicsSystem } from "../systems/physicsSystem";
import { PhysicsWorld } from "../systems/physicsWorld";
import { PlatformSpawnSystem } from "../systems/platformSpawnSystem";
import { PlatformSystem } from "../systems/platformSystem";
import { PlayerAnimationStateSystem } from "../systems/playerAnimationStateSystem";
import { RenderSystem } from "../systems/renderSystem";
import { RestartSystem } from "../systems/restartSystem";
import type { InputStrategy } from "../input";
import type { CanvasRenderer } from "../render/renderer";
import type { AudioPlayer } from "../systems/audioPlayer";
import { GodModComponent } from "../components/godModComponent";
import { CheatSystem } from "../systems/cheatSystem";

export function registerGameComponents(world: World) {
	world.registerComponent(TransformComponent);
	world.registerComponent(CollidedComponent);
	world.registerComponent(ColliderComponent);
	world.registerComponent(Gravity);
	world.registerComponent(InputComponent);
	world.registerComponent(JumpComponent);
	world.registerComponent(MovementComponent);
	world.registerComponent(PlayerComponent);
	world.registerComponent(CoinComponent);
	world.registerComponent(RocketBoosterComponent);
	world.registerComponent(RocketFlightComponent);
	world.registerComponent(PrimitiveRenderComponent);
	world.registerComponent(VelocityComponent);
	world.registerComponent(SpriteRenderComponent);
	world.registerComponent(RenderLayerComponent);
	world.registerComponent(FacingComponent);
	world.registerComponent(AnimationState);
	world.registerComponent(AnimationTable);
	world.registerComponent(AnimationTimer);
	world.registerComponent(Camera);
	world.registerComponent(PlatformSpawner);
	world.registerComponent(PlatformComponent);
	world.registerComponent(FollowCameraComponent);
	world.registerComponent(CounterComponent);
	world.registerComponent(TextRenderComponent);
	world.registerComponent(FPSComponent);
	world.registerComponent(GodModComponent);
}

import { Screen } from "../core/screen";

export type RegisterGameSystemsDeps = {
	screen: Screen;
	inputStrategy: InputStrategy;
	renderer?: CanvasRenderer;
	audioPlayer?: AudioPlayer;
	includeRender?: boolean;
	includeAudio?: boolean;
	/**
	 * Позволяет подменить источники рандома в PlatformSpawnSystem (для детерминизма).
	 * Если не передано — используется дефолтное поведение PlatformSpawnSystem.
	 */
	platformRandom?: ConstructorParameters<typeof PlatformSpawnSystem>[0];
	platformRandomSize?: ConstructorParameters<typeof PlatformSpawnSystem>[1];
	platformRandomRocket?: ConstructorParameters<typeof PlatformSpawnSystem>[2];
	rocketBoosterRandom?: ConstructorParameters<typeof RocketBoosterSystem>[0];
};

export function registerGameSystems(
	world: World,
	deps: RegisterGameSystemsDeps,
) {
	const physicsWorld = new PhysicsWorld(world, deps.screen);

	world.registerSystem(new CheatSystem());
	world.registerSystem(new InputSystem(deps.inputStrategy));
	world.registerSystem(new MovementSystem());
	world.registerSystem(new JumpSystem());
	world.registerSystem(physicsWorld);
	world.registerSystem(new CoinSystem());
	world.registerSystem(new RocketBoosterSystem(deps.rocketBoosterRandom));
	world.registerSystem(new PhysicsSystem(physicsWorld));
	world.registerSystem(new RocketFlightSystem());
	world.registerSystem(new FacingSystem());
	world.registerSystem(new CameraSystem(deps.screen));
	world.registerSystem(new DeathSystem(deps.screen));
	world.registerSystem(new RestartSystem(deps.screen));
	world.registerSystem(
		new PlatformSpawnSystem(
			deps.platformRandom,
			deps.platformRandomSize,
			deps.platformRandomRocket,
		),
	);

	world.registerSystem(new PlatformSystem());
	world.registerSystem(new AnimatedSpriteSystem());
	world.registerSystem(new PlayerAnimationStateSystem());

	if (deps.includeAudio && deps.audioPlayer) {
		world.registerSystem(new AudioSystem(deps.audioPlayer));
	}

	world.registerSystem(new CounterSystem());
	world.registerSystem(new FPSSystem());

	if (deps.includeRender && deps.renderer) {
		world.registerSystem(new RenderSystem(deps.renderer, deps.screen));
	}

	return { physicsWorld };
}
